-- Fechamento mensal: o saldo final de um mês vira o saldo inicial do seguinte.
-- Fica registrado em monthly_closings. Fecha sozinho no dia 1 (pg_cron) e é recalculado
-- quando um lançamento de mês já fechado é criado, alterado ou excluído.

create table public.monthly_closings (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  ref_month       date not null check (extract(day from ref_month) = 1),
  opening_balance bigint not null,
  income          bigint not null,
  outflow         bigint not null,   -- gastos em dinheiro/débito/pix, fatura paga, acertos
  saved           bigint not null,   -- aplicado menos resgatado
  closing_balance bigint not null,
  closed_at       timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, ref_month)
);
alter table public.monthly_closings enable row level security;
create policy "own closings read" on public.monthly_closings for select to authenticated
  using (user_id = (select auth.uid()));
create trigger monthly_closings_set_updated_at before update on public.monthly_closings
  for each row execute function private.set_updated_at();

-- Fluxo de caixa do mês (mesma regra do saldo, 7.1): compra no crédito não sai do saldo.
create function private.month_cash_flow(p_user uuid, p_month date)
returns table (income bigint, outflow bigint, saved bigint)
language sql stable security definer set search_path = '' as $$
  select
    coalesce(sum(amount) filter (where type = 'income'), 0)::bigint,
    coalesce(sum(amount) filter (where (type = 'expense' and not private.wallet_is_credit(wallet_id))
                                   or type in ('invoice_payment', 'settlement_payment')), 0)::bigint,
    (coalesce(sum(amount) filter (where type = 'save_apply'), 0)
     - coalesce(sum(amount) filter (where type = 'save_redeem'), 0))::bigint
  from public.transactions
  where assigned_to = p_user and status = 'confirmed'
    and date >= p_month and date < (p_month + interval '1 month')::date
$$;

-- Fecha um mês: saldo inicial = fechamento do mês anterior (ou tudo antes dele, se não houver).
create function private.close_month(p_user uuid, p_month date) returns bigint
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
    select coalesce(sum(case
      when type in ('income', 'save_redeem') then amount
      when type = 'expense' and private.wallet_is_credit(wallet_id) then 0
      else -amount end), 0)
    into v_opening
    from public.transactions
    where assigned_to = p_user and status = 'confirmed' and date < v_month;
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

-- Fecha todos os meses de um usuário até o mês passado, a partir de p_from (encadeando os saldos).
create function private.close_months_from(p_user uuid, p_from date) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_last date := (private.month_start(private.today_br()) - interval '1 month')::date;
  m date := private.month_start(p_from);
begin
  while m <= v_last loop
    perform private.close_month(p_user, m);
    m := (m + interval '1 month')::date;
  end loop;
end $$;

-- Rotina do dia 1: fecha o mês passado de todo mundo (e preenche meses que faltarem).
create function private.close_all_users() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  u record;
  v_first date;
  v_last_closed date;
  n integer := 0;
begin
  for u in select id from auth.users loop
    select max(ref_month) into v_last_closed from public.monthly_closings where user_id = u.id;
    select private.month_start(min(date)) into v_first from public.transactions where assigned_to = u.id;
    if v_first is null then continue; end if;
    perform private.close_months_from(u.id, coalesce((v_last_closed + interval '1 month')::date, v_first));
    n := n + 1;
  end loop;
  return n;
end $$;

-- Lançamento mexido em mês já fechado: recalcula daquele mês em diante.
create function private.transactions_refresh_closings() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_current date := private.month_start(private.today_br());
  r record;
begin
  for r in
    select distinct x.uid, x.d from (
      select old.assigned_to as uid, old.date as d where tg_op in ('UPDATE', 'DELETE')
      union all
      select new.assigned_to, new.date where tg_op in ('INSERT', 'UPDATE')
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

create trigger transactions_refresh_closings
  after insert or update or delete on public.transactions
  for each row execute function private.transactions_refresh_closings();

revoke execute on function private.month_cash_flow(uuid, date) from public, anon, authenticated;
revoke execute on function private.close_month(uuid, date) from public, anon, authenticated;
revoke execute on function private.close_months_from(uuid, date) from public, anon, authenticated;
revoke execute on function private.close_all_users() from public, anon, authenticated;
revoke execute on function private.transactions_refresh_closings() from public, anon, authenticated;

-- month_summary passa a usar o fechamento do mês anterior como saldo inicial (quando existir).
create or replace function public.month_summary(p_month date) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
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
    coalesce(sum(amount) filter (where type = 'income'), 0) as income,
    coalesce(sum(amount) filter (where type = 'expense'), 0) as spending,
    coalesce(sum(amount) filter (where type = 'expense' and not private.wallet_is_credit(wallet_id)), 0) as cash_expense,
    coalesce(sum(amount) filter (where type = 'save_apply'), 0) as saved,
    coalesce(sum(amount) filter (where type = 'save_redeem'), 0) as redeemed,
    coalesce(sum(amount) filter (where type = 'invoice_payment'), 0) as invoice_paid,
    coalesce(sum(amount) filter (where type = 'settlement_payment'), 0) as settlement_paid,
    count(*) filter (where type = 'expense') as expense_count
  into r
  from public.transactions
  where assigned_to = v_uid and status = 'confirmed' and date >= v_start and date < v_end;

  if v_carry then
    select closing_balance into v_closed from public.monthly_closings
    where user_id = v_uid and ref_month = (v_start - interval '1 month')::date;
    if v_closed is not null then
      v_opening := v_closed;
    else
      select
        coalesce(sum(case
          when type in ('income', 'save_redeem') then amount
          when type = 'expense' and private.wallet_is_credit(wallet_id) then 0
          else -amount end), 0)
      into v_opening
      from public.transactions
      where assigned_to = v_uid and status = 'confirmed' and date < v_start;
    end if;
  end if;

  select coalesce(sum(it.total), 0)
       - coalesce((select sum(s.amount) from public.settlements s
                   where s.holder_id = v_uid and s.status = 'confirmed'), 0)
  into v_receivable
  from public.invoice_totals it
  join public.wallets w on w.id = it.wallet_id
  where w.owner_id = v_uid and it.assigned_to <> v_uid;

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

-- dia 1 às 03:33 (UTC), fecha o mês anterior de todos
select cron.schedule('troco-monthly-closing', '33 3 1 * *', $$select private.close_all_users();$$);
