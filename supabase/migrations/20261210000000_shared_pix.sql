-- Pix dividido (2026-11-23): um Pix que alguém pagou e que é dividido entre pessoas da família.
-- Ex.: a madrinha pagou o bolo por Pix e cada sobrinho deve metade a ela.
--
-- shared_payments guarda o Pix (quem pagou, total, data, local). Cada pessoa com parte ganha um gasto
-- (transactions.shared_payment_id) no próprio nome, com paid_by = quem pagou. Regra de caixa:
--   * gasto com paid_by: sai do saldo de quem pagou (paid_by), não de quem tem a parte (assigned_to);
--   * gasto sem paid_by: como antes (sai do saldo de assigned_to, menos no crédito).
-- Quem deve informa o acerto por Pix (settlements.shared_payment_id), como na fatura do cartão;
-- quem pagou confirma (entra receita de Reembolso). Pessoa sem o app não confirma: o acerto entra confirmado,
-- e quem pagou registra o que recebeu de quem não tem o app.

create table public.shared_payments (
  id          uuid primary key default gen_random_uuid(),
  payer_id    uuid not null references auth.users(id) on delete cascade,
  created_by  uuid default auth.uid() references auth.users(id) on delete set null,
  amount      bigint not null check (amount > 0),
  date        date not null,
  place       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger shared_payments_set_updated_at before update on public.shared_payments
  for each row execute function private.set_updated_at();
alter table public.shared_payments enable row level security;

alter table public.transactions
  add column paid_by uuid references auth.users(id) on delete set null,
  add column shared_payment_id uuid references public.shared_payments(id) on delete cascade;
comment on column public.transactions.paid_by is
  'Quem pagou, quando o dinheiro saiu de outra pessoa (Pix dividido). O gasto sai do saldo dela.';
create index transactions_paid_by_idx on public.transactions (paid_by) where paid_by is not null;
create index transactions_shared_idx on public.transactions (shared_payment_id) where shared_payment_id is not null;

alter table public.settlements
  add column shared_payment_id uuid references public.shared_payments(id) on delete cascade,
  alter column invoice_ref drop not null,
  add constraint settlements_target_check check (invoice_ref is not null or shared_payment_id is not null);
create index settlements_shared_idx on public.settlements (shared_payment_id) where shared_payment_id is not null;

-- leitura: quem pagou, quem registrou e quem tem parte
create policy "shared payments read" on public.shared_payments for select to authenticated
  using (payer_id = (select auth.uid()) or created_by = (select auth.uid())
         or exists (select 1 from public.transactions t
                    where t.shared_payment_id = shared_payments.id and t.assigned_to = (select auth.uid())));

-- quem pagou vê as partes das outras pessoas (o dinheiro saiu dela)
drop policy "transactions read" on public.transactions;
create policy "transactions read" on public.transactions for select to authenticated
  using (assigned_to = (select auth.uid())
         or private.wallet_owner(wallet_id) = (select auth.uid())
         or holder_id = (select auth.uid())
         or paid_by = (select auth.uid()));

-- Regras de escrita (mesmas de antes) + Pix dividido: a parte não tem carteira; valor, data e pessoa só mudam
-- pelas funções do Pix dividido (troco.shared = on). A pessoa ainda muda categoria, local e itens da própria parte.
create or replace function private.transactions_before_write() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_old_owner uuid;
  v_rpc boolean := coalesce(current_setting('troco.shared', true), '') = 'on';
begin
  if tg_op in ('UPDATE', 'DELETE') and v_uid is not null then
    v_old_owner := private.wallet_owner(old.wallet_id);
    -- ATR-6: depois do fechamento, só o titular altera compras do cartão.
    if v_old_owner is distinct from v_uid
       and old.invoice_ref is not null
       and private.invoice_closing_date(old.wallet_id, old.invoice_ref) < private.today_br() then
      raise exception 'Fatura já fechou. Só o titular do cartão pode alterar esta compra.';
    end if;
  end if;

  if tg_op in ('UPDATE', 'DELETE') and old.shared_payment_id is not null and v_uid is not null and not v_rpc then
    if tg_op = 'DELETE' then
      -- exclusão em cascata (Pix excluído, conta excluída) passa; a parte sozinha não
      if exists (select 1 from public.shared_payments sp where sp.id = old.shared_payment_id)
         and exists (select 1 from auth.users u where u.id = old.assigned_to) then
        raise exception 'Este gasto é parte de um Pix dividido. Exclua o Pix em Cartões.';
      end if;
    elsif new.amount <> old.amount or new.date <> old.date or new.type <> old.type or new.status <> old.status
          or new.assigned_to is distinct from old.assigned_to
          or new.shared_payment_id is distinct from old.shared_payment_id
          or (new.paid_by is distinct from old.paid_by and new.paid_by is not null) then
      raise exception 'Parte de Pix dividido: para mudar valor, data ou pessoas, exclua o Pix em Cartões e registre de novo.';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  new.created_by := coalesce(new.created_by, v_uid);
  new.assigned_to := coalesce(new.assigned_to, new.created_by);

  if new.status = 'confirmed' and new.type <> 'income' and new.wallet_id is null
     and new.shared_payment_id is null and tg_op = 'INSERT' then
    raise exception 'Escolha a carteira.';
  end if;

  -- Compra no crédito: calcula a fatura. Pagamento de fatura mantém a referência informada.
  if new.type = 'expense' then
    new.invoice_ref := private.invoice_ref_for(new.wallet_id, new.date);
  elsif new.type not in ('invoice_payment', 'settlement_payment') then
    new.invoice_ref := null;
  end if;

  -- ATR-3: reatribuição só com fatura em aberto.
  if tg_op = 'UPDATE' and new.assigned_to is distinct from old.assigned_to
     and old.invoice_ref is not null and private.invoice_is_paid(old.wallet_id, old.invoice_ref) then
    raise exception 'Fatura já quitada. Não dá para mudar de quem é a compra.';
  end if;

  return new;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Saldo: gasto com paid_by sai do saldo de quem pagou.
-- ---------------------------------------------------------------------------------------------

-- quanto um lançamento mexe no saldo de p_user (positivo entra, negativo sai)
create function private.cash_effect(t public.transactions, p_user uuid) returns bigint
language sql stable security definer set search_path = '' as $$
  select case
    when t.type = 'expense' then
      case when t.paid_by is not null then (case when t.paid_by = p_user then -t.amount else 0 end)
           when t.assigned_to = p_user and not private.wallet_is_credit(t.wallet_id) then -t.amount
           else 0 end
    when t.assigned_to <> p_user then 0
    when t.type in ('income', 'save_redeem') then t.amount
    else -t.amount
  end
$$;
revoke execute on function private.cash_effect(public.transactions, uuid) from public, anon;
grant execute on function private.cash_effect(public.transactions, uuid) to authenticated, service_role;

create or replace function private.month_cash_flow(p_user uuid, p_month date)
returns table (income bigint, outflow bigint, saved bigint)
language sql stable security definer set search_path = '' as $$
  select
    coalesce(sum(t.amount) filter (where t.assigned_to = p_user and t.type = 'income'), 0)::bigint,
    coalesce(-sum(private.cash_effect(t, p_user)) filter (where t.type in ('expense', 'invoice_payment', 'settlement_payment')), 0)::bigint,
    (coalesce(sum(t.amount) filter (where t.assigned_to = p_user and t.type = 'save_apply'), 0)
     - coalesce(sum(t.amount) filter (where t.assigned_to = p_user and t.type = 'save_redeem'), 0))::bigint
  from public.transactions t
  where (t.assigned_to = p_user or t.paid_by = p_user) and t.status = 'confirmed'
    and t.date >= p_month and t.date < (p_month + interval '1 month')::date
$$;

create or replace function private.close_month(p_user uuid, p_month date) returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  v_month date := private.month_start(p_month);
  v_opening bigint;
  f record;
  v_closing bigint;
begin
  select closing_balance into v_opening from public.monthly_closings
  where user_id = p_user and ref_month = (v_month - interval '1 month')::date;

  if v_opening is null then
    select coalesce(sum(private.cash_effect(t, p_user)), 0) into v_opening
    from public.transactions t
    where (t.assigned_to = p_user or t.paid_by = p_user) and t.status = 'confirmed' and t.date < v_month;
  end if;

  select * into f from private.month_cash_flow(p_user, v_month);
  v_closing := v_opening + f.income - f.outflow - f.saved;

  insert into public.monthly_closings (user_id, ref_month, opening_balance, income, outflow, saved, closing_balance, closed_at)
  values (p_user, v_month, v_opening, f.income, f.outflow, f.saved, v_closing, now())
  on conflict (user_id, ref_month) do update set
    opening_balance = excluded.opening_balance, income = excluded.income, outflow = excluded.outflow,
    saved = excluded.saved, closing_balance = excluded.closing_balance, closed_at = now();
  return v_closing;
end $$;

-- lançamento antigo mexido: recalcula o fechamento de quem tem a parte e de quem pagou
create or replace function private.transactions_refresh_closings() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_current date := private.month_start(private.today_br());
  r record;
begin
  for r in
    select distinct x.uid, x.d from (
      select old.assigned_to as uid, old.date as d where tg_op in ('UPDATE', 'DELETE')
      union all
      select old.paid_by, old.date where tg_op in ('UPDATE', 'DELETE') and old.paid_by is not null
      union all
      select new.assigned_to, new.date where tg_op in ('INSERT', 'UPDATE')
      union all
      select new.paid_by, new.date where tg_op in ('INSERT', 'UPDATE') and new.paid_by is not null
    ) x
  loop
    if r.d < v_current and exists (
      select 1 from public.monthly_closings where user_id = r.uid and ref_month >= private.month_start(r.d)
    ) then
      perform private.close_months_from(r.uid, r.d);
    end if;
  end loop;
  return null;
end $$;

create or replace function public.month_summary(p_month date) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_start date := private.month_start(p_month);
  v_end date := (private.month_start(p_month) + interval '1 month')::date;
  v_carry boolean;
  r record;
  v_opening bigint := 0;
  v_closed bigint;
  v_receivable bigint;
begin
  select carry_over_balance into v_carry from public.profiles where id = v_uid;

  select
    coalesce(sum(t.amount) filter (where t.assigned_to = v_uid and t.type = 'income'), 0) as income,
    coalesce(sum(t.amount) filter (where t.assigned_to = v_uid and t.type = 'expense'), 0) as spending,
    coalesce(-sum(private.cash_effect(t, v_uid)) filter (where t.type = 'expense'), 0) as cash_expense,
    coalesce(sum(t.amount) filter (where t.assigned_to = v_uid and t.type = 'save_apply'), 0) as saved,
    coalesce(sum(t.amount) filter (where t.assigned_to = v_uid and t.type = 'save_redeem'), 0) as redeemed,
    coalesce(sum(t.amount) filter (where t.assigned_to = v_uid and t.type = 'invoice_payment'), 0) as invoice_paid,
    coalesce(sum(t.amount) filter (where t.assigned_to = v_uid and t.type = 'settlement_payment'), 0) as settlement_paid,
    count(*) filter (where t.assigned_to = v_uid and t.type = 'expense') as expense_count
  into r
  from public.transactions t
  where (t.assigned_to = v_uid or t.paid_by = v_uid) and t.status = 'confirmed' and t.date >= v_start and t.date < v_end;

  if v_carry then
    select closing_balance into v_closed from public.monthly_closings
    where user_id = v_uid and ref_month = (v_start - interval '1 month')::date;
    if v_closed is not null then
      v_opening := v_closed;
    else
      select coalesce(sum(private.cash_effect(t, v_uid)), 0) into v_opening
      from public.transactions t
      where (t.assigned_to = v_uid or t.paid_by = v_uid) and t.status = 'confirmed' and t.date < v_start;
    end if;
  end if;

  select coalesce(sum(greatest(it.total - coalesce((
           select sum(s.amount) from public.settlements s
           where s.wallet_id = it.wallet_id and s.invoice_ref = it.invoice_ref
             and s.debtor_id = it.assigned_to and s.status = 'confirmed'), 0), 0)), 0)
  into v_receivable
  from public.invoice_totals it
  join public.wallets w on w.id = it.wallet_id
  where w.owner_id = v_uid and it.assigned_to <> v_uid
    and private.invoice_due_date(it.wallet_id, it.invoice_ref) < v_end;

  return jsonb_build_object(
    'month', v_start,
    'income', r.income,
    'spending', r.spending,
    'expense_count', r.expense_count,
    'cash_expense', r.cash_expense,
    'saved', r.saved,
    'redeemed', r.redeemed,
    'invoice_paid', r.invoice_paid,
    'settlement_paid', r.settlement_paid,
    'opening_balance', v_opening,
    'balance', v_opening + r.income - r.cash_expense - r.saved + r.redeemed - r.invoice_paid - r.settlement_paid,
    'total_saved', (select coalesce(sum(case when type = 'save_apply' then amount else -amount end), 0)
                    from public.transactions
                    where assigned_to = v_uid and status = 'confirmed'
                      and type in ('save_apply', 'save_redeem') and date < v_end),
    'budget', (select total_amount from public.budgets where user_id = v_uid and ref_month = v_start),
    'receivable_from_members', greatest(v_receivable, 0),
    'pending_count', (select count(*) from public.transactions where assigned_to = v_uid and status = 'pending'),
    'closed', exists (select 1 from public.monthly_closings where user_id = v_uid and ref_month = v_start)
  );
end $$;

-- Pix para alguém da família: a parte de um Pix dividido não gera receita pendente para o destinatário.
create or replace function private.pix_to_member() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_to uuid;
  v_name text;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    delete from public.transactions p
     where p.status = 'pending' and p.type = 'income' and p.source = 'pix'
       and (p.source_data->>'pix_of')::uuid = old.id
       and (tg_op = 'DELETE'
            or p.assigned_to is distinct from nullif(new.source_data->'sender'->>'user_id', '')::uuid
            or new.type <> 'expense' or new.status <> 'confirmed'
            or coalesce((select w.type from public.wallets w where w.id = new.wallet_id), '') <> 'pix');
    if tg_op = 'DELETE' then return old; end if;
  end if;

  v_to := nullif(new.source_data->'sender'->>'user_id', '')::uuid;
  if v_to is null or v_to = new.assigned_to or new.type <> 'expense' or new.status <> 'confirmed'
     or new.shared_payment_id is not null
     or coalesce((select w.type from public.wallets w where w.id = new.wallet_id), '') <> 'pix'
     or not private.same_family(v_to, new.assigned_to) then
    return new;
  end if;

  update public.transactions p set amount = new.amount, date = new.date
   where p.status = 'pending' and p.type = 'income' and p.source = 'pix'
     and (p.source_data->>'pix_of')::uuid = new.id and p.assigned_to = v_to;
  if found then return new; end if;
  if exists (select 1 from public.transactions p where p.type = 'income' and (p.source_data->>'pix_of')::uuid = new.id) then
    return new;
  end if;

  select name into v_name from public.profiles where id = new.assigned_to;
  insert into public.transactions (type, amount, date, wallet_id, description, created_by, assigned_to, source, status, source_data)
  values ('income', new.amount, new.date, null, coalesce(new.place, 'Pix recebido'), new.assigned_to, v_to, 'pix', 'pending',
          jsonb_build_object('pix_of', new.id, 'sender', jsonb_build_object('user_id', new.assigned_to, 'name', coalesce(v_name, 'Alguém'))));
  insert into public.notification_queue (user_id, kind, title, body, url)
  values (v_to, 'family_events', 'Pix para confirmar',
          coalesce(v_name, 'Alguém') || ' te enviou ' || private.brl(new.amount) || '. Confirme para entrar nas receitas.',
          '/home?pendentes=1');
  return new;
end $$;

-- ---------------------------------------------------------------------------------------------
-- RPCs do Pix dividido
-- ---------------------------------------------------------------------------------------------

-- Registra um Pix dividido. p_payer: quem pagou (você ou alguém da família). p_wallet: sua carteira Pix,
-- quando foi você que pagou. p_parts: [{user_id, amount}] somando p_amount; pode não incluir quem pagou.
-- p_category vale só para a sua parte (categorias são de cada um). Devolve o id do Pix dividido.
create function public.create_shared_payment(
  p_payer uuid, p_wallet uuid, p_amount bigint, p_date date, p_place text, p_category uuid,
  p_parts jsonb, p_source text default 'manual', p_source_data jsonb default null, p_receipt_path text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_part jsonb;
  v_user uuid;
  v_share bigint;
  v_sum bigint := 0;
  v_count integer := 0;
  v_only uuid;
  v_name text;
  v_payer_name text;
  v_place text := nullif(trim(p_place), '');
  v_parts jsonb;
begin
  if v_uid is null then raise exception 'Não autenticado'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Informe o valor.'; end if;
  if p_payer is null or (p_payer <> v_uid and not private.same_family(p_payer, v_uid)) then
    raise exception 'Quem pagou precisa ser você ou alguém da sua família.';
  end if;
  if p_payer = v_uid and (p_wallet is null or private.wallet_owner(p_wallet) is distinct from v_uid
                          or private.wallet_is_credit(p_wallet)) then
    raise exception 'Escolha a carteira do Pix.';
  end if;
  if p_category is not null and not exists (select 1 from public.categories where id = p_category and user_id = v_uid) then
    raise exception 'Categoria inválida.';
  end if;

  for v_part in select * from jsonb_array_elements(coalesce(p_parts, '[]'::jsonb)) loop
    v_user := (v_part->>'user_id')::uuid;
    v_share := (v_part->>'amount')::bigint;
    if v_share is null or v_share < 0 then raise exception 'Parte com valor inválido.'; end if;
    if v_user <> v_uid and not private.same_family(v_user, v_uid) then
      raise exception 'Só dá para dividir com pessoas da sua família.';
    end if;
    if v_share > 0 then v_count := v_count + 1; v_only := v_user; end if;
    v_sum := v_sum + v_share;
  end loop;
  if v_sum <> p_amount then raise exception 'As partes precisam somar o valor do Pix.'; end if;
  if v_count = 0 or (v_count = 1 and v_only = p_payer) then
    raise exception 'Escolha quem divide o Pix.';
  end if;
  if (select count(distinct x->>'user_id') from jsonb_array_elements(p_parts) x) <> jsonb_array_length(p_parts) then
    raise exception 'Pessoa repetida na divisão.';
  end if;

  select jsonb_agg(jsonb_build_object('user_id', x->>'user_id', 'amount', (x->>'amount')::bigint))
    into v_parts from jsonb_array_elements(p_parts) x where (x->>'amount')::bigint > 0;

  insert into public.shared_payments (payer_id, created_by, amount, date, place)
  values (p_payer, v_uid, p_amount, p_date, v_place)
  returning id into v_id;

  select name into v_name from public.profiles where id = v_uid;
  select name into v_payer_name from public.profiles where id = p_payer;

  for v_part in select * from jsonb_array_elements(p_parts) loop
    v_user := (v_part->>'user_id')::uuid;
    v_share := (v_part->>'amount')::bigint;
    continue when v_share = 0;
    insert into public.transactions (type, amount, date, wallet_id, category_id, place, created_by, assigned_to,
      paid_by, shared_payment_id, source, source_data, receipt_path)
    values ('expense', v_share, p_date,
      case when v_user = p_payer and p_payer = v_uid then p_wallet end,
      case when v_user = v_uid then p_category end,
      v_place, v_uid, v_user, p_payer, v_id, coalesce(p_source, 'manual'),
      coalesce(p_source_data, '{}'::jsonb) || jsonb_build_object('shared_total', p_amount, 'shared_parts', v_parts),
      case when v_user = v_uid then p_receipt_path end);

    if v_user <> v_uid and v_user <> p_payer then
      insert into public.notification_queue (user_id, kind, title, body, url)
      values (v_user, 'family_events', 'Pix dividido',
              'Sua parte: ' || private.brl(v_share) || coalesce(' em ' || v_place, '') || '. Quem pagou: '
                || case when p_payer = v_uid then coalesce(v_name, 'alguém') else coalesce(v_payer_name, 'alguém') end || '.',
              '/cards/pessoa/' || p_payer);
    end if;
  end loop;

  if p_payer <> v_uid then
    insert into public.notification_queue (user_id, kind, title, body, url)
    values (p_payer, 'family_events', 'Pix dividido',
            coalesce(v_name, 'Alguém') || ' registrou que você pagou ' || private.brl(p_amount)
              || coalesce(' em ' || v_place, '') || ', dividido entre a família.',
            '/cards');
  end if;
  return v_id;
end $$;

-- Exclui o Pix dividido inteiro (todas as partes). Só quem registrou ou quem pagou, e sem acerto.
create function public.delete_shared_payment(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  sp public.shared_payments;
begin
  select * into sp from public.shared_payments where id = p_id;
  if sp.id is null or (sp.payer_id <> v_uid and sp.created_by is distinct from v_uid) then
    raise exception 'Só quem registrou ou quem pagou exclui este Pix.';
  end if;
  if exists (select 1 from public.settlements where shared_payment_id = p_id) then
    raise exception 'Este Pix já tem acerto. Cancele ou recuse o acerto antes de excluir.';
  end if;
  perform set_config('troco.shared', 'on', true);
  delete from public.shared_payments where id = p_id;
  perform set_config('troco.shared', 'off', true);
end $$;

-- O que cada pessoa deve em cada Pix dividido em que sou quem pagou ou quem deve.
create function public.shared_debts()
returns table (shared_payment_id uuid, payer_id uuid, debtor_id uuid, created_by uuid, place text, date date,
               total bigint, part bigint, settled bigint, reported bigint, open bigint, reported_paid_on date)
language sql stable security definer set search_path = '' as $$
  with mine as (
    select sp.* from public.shared_payments sp
    where sp.payer_id = (select auth.uid())
       or exists (select 1 from public.transactions t
                  where t.shared_payment_id = sp.id and t.assigned_to = (select auth.uid()))
  ), parts as (
    select t.shared_payment_id, t.assigned_to, sum(t.amount)::bigint as part
    from public.transactions t
    where t.shared_payment_id in (select id from mine) and t.type = 'expense' and t.status = 'confirmed'
    group by t.shared_payment_id, t.assigned_to
  )
  select m.id, m.payer_id, p.assigned_to, m.created_by, m.place, m.date, m.amount, p.part,
         coalesce(s.confirmed, 0)::bigint, coalesce(s.reported, 0)::bigint,
         greatest(p.part - coalesce(s.confirmed, 0), 0)::bigint, s.reported_paid_on
  from mine m
  join parts p on p.shared_payment_id = m.id
  left join lateral (
    select sum(x.amount) filter (where x.status = 'confirmed') as confirmed,
           sum(x.amount) filter (where x.status = 'reported') as reported,
           max(x.paid_on) filter (where x.status = 'reported') as reported_paid_on
    from public.settlements x
    where x.shared_payment_id = m.id and x.debtor_id = p.assigned_to and x.status in ('confirmed', 'reported')
  ) s on true
  where p.assigned_to <> m.payer_id
    and (m.payer_id = (select auth.uid()) or p.assigned_to = (select auth.uid()))
  order by m.date, m.created_at
$$;

-- Partes de um Pix dividido (para quem pagou, quem registrou ou quem tem parte): quem, quanto e quanto falta.
create function public.shared_payment_parts(p_id uuid)
returns table (user_id uuid, part bigint, settled bigint, open bigint)
language sql stable security definer set search_path = '' as $$
  select t.assigned_to, sum(t.amount)::bigint,
         coalesce((select sum(s.amount) from public.settlements s
                   where s.shared_payment_id = p_id and s.debtor_id = t.assigned_to and s.status = 'confirmed'), 0)::bigint,
         case when t.assigned_to = sp.payer_id then 0
              else greatest(sum(t.amount) - coalesce((select sum(s.amount) from public.settlements s
                   where s.shared_payment_id = p_id and s.debtor_id = t.assigned_to and s.status = 'confirmed'), 0), 0) end::bigint
  from public.transactions t
  join public.shared_payments sp on sp.id = t.shared_payment_id
  where t.shared_payment_id = p_id and t.type = 'expense' and t.status = 'confirmed'
    and (sp.payer_id = (select auth.uid()) or sp.created_by = (select auth.uid())
         or exists (select 1 from public.transactions x where x.shared_payment_id = p_id and x.assigned_to = (select auth.uid())))
  group by t.assigned_to, sp.payer_id
  order by (t.assigned_to = sp.payer_id) desc, sum(t.amount) desc
$$;

-- Quem deve informa que pagou a sua parte (ou parte dela). Quem pagou confirma; se quem pagou
-- não tem o app, o acerto já entra confirmado.
create function public.report_shared_settlement(p_shared uuid, p_amount bigint, p_from_wallet uuid, p_date date)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  sp public.shared_payments;
  v_part bigint;
  v_done bigint;
  v_tx uuid;
  v_id uuid;
  v_name text;
  v_guest boolean;
  v_paid date := coalesce(p_date, private.today_br());
begin
  if v_uid is null then raise exception 'Não autenticado'; end if;
  select * into sp from public.shared_payments where id = p_shared;
  if sp.id is null or sp.payer_id = v_uid then raise exception 'Pix inválido para acerto.'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Informe o valor.'; end if;
  if v_paid > private.today_br() then raise exception 'A data do pagamento não pode ser no futuro.'; end if;
  if private.wallet_owner(p_from_wallet) is distinct from v_uid or private.wallet_is_credit(p_from_wallet) then
    raise exception 'Escolha uma carteira sua (Pix, débito ou dinheiro).';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_shared::text || v_uid::text));
  if exists (select 1 from public.settlements
             where shared_payment_id = p_shared and debtor_id = v_uid and status = 'reported') then
    raise exception 'Acerto já informado. Para mudar, cancele o que está aguardando.';
  end if;
  select coalesce(sum(amount), 0) into v_part from public.transactions
   where shared_payment_id = p_shared and assigned_to = v_uid and type = 'expense' and status = 'confirmed';
  if v_part <= 0 then raise exception 'Você não tem parte neste Pix.'; end if;
  select coalesce(sum(amount), 0) into v_done from public.settlements
   where shared_payment_id = p_shared and debtor_id = v_uid and status in ('confirmed', 'reported');
  if p_amount > v_part - v_done then
    if v_part - v_done <= 0 then raise exception 'Sua parte deste Pix já foi toda informada.'; end if;
    raise exception 'Falta informar só %.', private.brl(v_part - v_done);
  end if;

  insert into public.transactions (type, amount, date, wallet_id, description, created_by, assigned_to)
  values ('settlement_payment', p_amount, v_paid, p_from_wallet, 'Acerto de Pix', v_uid, v_uid)
  returning id into v_tx;

  select coalesce(is_guest, false) into v_guest from public.profiles where id = sp.payer_id;
  insert into public.settlements (wallet_id, debtor_id, holder_id, invoice_ref, shared_payment_id, amount, status,
                                  reported_at, confirmed_at, debtor_transaction_id, paid_on)
  values (null, v_uid, sp.payer_id, null, p_shared, p_amount, case when v_guest then 'confirmed' else 'reported' end,
          now(), case when v_guest then now() end, v_tx, v_paid)
  returning id into v_id;

  if not v_guest then
    select name into v_name from public.profiles where id = v_uid;
    insert into public.notification_queue (user_id, kind, title, body, url)
    values (sp.payer_id, 'family_events', 'Pagamento para confirmar',
            coalesce(v_name, 'Alguém') || ' informou que pagou ' || private.brl(p_amount) || ' em ' || to_char(v_paid, 'DD/MM')
              || ' do Pix' || coalesce(' de ' || sp.place, ''),
            '/cards/pessoa/' || v_uid);
  end if;
  return v_id;
end $$;

-- Quem pagou registra o que recebeu de uma pessoa sem o app (ela não consegue informar).
create function public.receive_shared_settlement(p_shared uuid, p_debtor uuid, p_amount bigint, p_to_wallet uuid, p_date date)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  sp public.shared_payments;
  v_part bigint;
  v_done bigint;
  v_tx uuid;
  v_id uuid;
  v_name text;
  v_paid date := coalesce(p_date, private.today_br());
begin
  select * into sp from public.shared_payments where id = p_shared;
  if sp.id is null or sp.payer_id is distinct from v_uid then raise exception 'Pix não encontrado.'; end if;
  if not coalesce((select is_guest from public.profiles where id = p_debtor), false) then
    raise exception 'Quem tem o app informa o acerto.';
  end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Informe o valor.'; end if;
  if v_paid > private.today_br() then raise exception 'A data do pagamento não pode ser no futuro.'; end if;
  if private.wallet_owner(p_to_wallet) is distinct from v_uid or private.wallet_is_credit(p_to_wallet) then
    raise exception 'Escolha uma carteira sua para receber.';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_shared::text || p_debtor::text));
  select coalesce(sum(amount), 0) into v_part from public.transactions
   where shared_payment_id = p_shared and assigned_to = p_debtor and type = 'expense' and status = 'confirmed';
  select coalesce(sum(amount), 0) into v_done from public.settlements
   where shared_payment_id = p_shared and debtor_id = p_debtor and status in ('confirmed', 'reported');
  if p_amount > v_part - v_done then
    if v_part - v_done <= 0 then raise exception 'Esta parte já foi toda acertada.'; end if;
    raise exception 'Falta receber só %.', private.brl(v_part - v_done);
  end if;

  select name into v_name from public.profiles where id = p_debtor;
  insert into public.transactions (type, amount, date, wallet_id, category_id, description, created_by, assigned_to)
  values ('income', p_amount, v_paid, p_to_wallet,
          (select id from public.categories where user_id = v_uid and type = 'income' and name = 'Reembolso' limit 1),
          'Acerto de ' || coalesce(v_name, 'membro'), v_uid, v_uid)
  returning id into v_tx;

  insert into public.settlements (wallet_id, debtor_id, holder_id, invoice_ref, shared_payment_id, amount, status,
                                  reported_at, confirmed_at, holder_transaction_id, paid_on)
  values (null, p_debtor, v_uid, null, p_shared, p_amount, 'confirmed', now(), now(), v_tx, v_paid)
  returning id into v_id;
  return v_id;
end $$;

-- confirmar e recusar valem para fatura e para Pix dividido (o link do aviso muda)
create or replace function public.confirm_settlement(p_settlement uuid, p_to_wallet uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  s public.settlements;
  v_tx uuid;
  v_name text;
begin
  select * into s from public.settlements where id = p_settlement;
  if s.id is null or s.holder_id is distinct from v_uid then raise exception 'Acerto não encontrado.'; end if;
  if s.status <> 'reported' then raise exception 'Este acerto já foi tratado.'; end if;
  if private.wallet_owner(p_to_wallet) is distinct from v_uid or private.wallet_is_credit(p_to_wallet) then
    raise exception 'Escolha uma carteira sua para receber.';
  end if;

  select name into v_name from public.profiles where id = s.debtor_id;
  insert into public.transactions (type, amount, date, wallet_id, category_id, description, created_by, assigned_to)
  values ('income', s.amount, coalesce(s.paid_on, private.today_br()), p_to_wallet,
          (select id from public.categories where user_id = v_uid and type = 'income' and name = 'Reembolso' limit 1),
          'Acerto de ' || coalesce(v_name, 'membro'), v_uid, v_uid)
  returning id into v_tx;

  update public.settlements set status = 'confirmed', confirmed_at = now(), holder_transaction_id = v_tx where id = s.id;

  insert into public.notification_queue (user_id, kind, title, body, url)
  values (s.debtor_id, 'family_events', 'Pagamento confirmado',
          'Seu acerto de ' || private.brl(s.amount) || ' foi confirmado.',
          coalesce('/cards/' || s.wallet_id, '/cards/pessoa/' || s.holder_id));
end $$;

create or replace function public.reject_settlement(p_settlement uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  s public.settlements;
begin
  select * into s from public.settlements where id = p_settlement;
  if s.id is null or s.holder_id is distinct from auth.uid() then raise exception 'Acerto não encontrado.'; end if;
  if s.status <> 'reported' then raise exception 'Este acerto já foi tratado.'; end if;
  delete from public.settlements where id = s.id;
  delete from public.transactions where id = s.debtor_transaction_id;
  insert into public.notification_queue (user_id, kind, title, body, url)
  values (s.debtor_id, 'family_events', 'Pagamento não confirmado',
          'O acerto de ' || private.brl(s.amount) || ' não foi confirmado. Fale com a pessoa.',
          coalesce('/cards/' || s.wallet_id, '/cards/pessoa/' || s.holder_id));
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.create_shared_payment(uuid, uuid, bigint, date, text, uuid, jsonb, text, jsonb, text)',
    'public.delete_shared_payment(uuid)',
    'public.shared_debts()',
    'public.shared_payment_parts(uuid)',
    'public.report_shared_settlement(uuid, bigint, uuid, date)',
    'public.receive_shared_settlement(uuid, uuid, bigint, uuid, date)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
