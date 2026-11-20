-- Compra sem cartão definido: a pessoa lembra de quem é o cartão, mas não de qual.
-- Fica pendente (sem carteira) com o titular em holder_id. O titular vê e escolhe o cartão
-- (resolve_card_pending); a própria pessoa também pode escolher depois, pelo Novo gasto.

alter table public.transactions
  add column holder_id uuid references auth.users(id) on delete set null;

comment on column public.transactions.holder_id is
  'Titular do cartão quando a compra ainda não tem carteira (pendente, cartão a definir).';

alter table public.transactions
  add constraint transactions_holder_pending_check
  check (holder_id is null or (wallet_id is null and status = 'pending'));

create index transactions_holder_idx on public.transactions (holder_id) where holder_id is not null;

-- leitura: o titular também vê a compra que espera ele escolher o cartão
drop policy "transactions read" on public.transactions;
create policy "transactions read" on public.transactions for select to authenticated
  using (assigned_to = (select auth.uid())
         or private.wallet_owner(wallet_id) = (select auth.uid())
         or holder_id = (select auth.uid()));

-- inserção: o titular indicado tem que ser você ou alguém da sua família
drop policy "transactions insert" on public.transactions;
create policy "transactions insert" on public.transactions for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (wallet_id is null or private.has_wallet_access(wallet_id, (select auth.uid())))
    and (to_wallet_id is null or private.wallet_owner(to_wallet_id) = (select auth.uid()))
    and (assigned_to = (select auth.uid())
         or (private.wallet_owner(wallet_id) = (select auth.uid()) and private.has_wallet_access(wallet_id, assigned_to)))
    and (holder_id is null or holder_id = (select auth.uid()) or private.same_family(holder_id, (select auth.uid())))
  );

-- aviso ao titular quando alguém registra uma compra no cartão dele sem dizer qual
create function private.notify_card_holder() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.holder_id is not null and new.holder_id <> new.assigned_to then
    insert into public.notification_queue (user_id, kind, title, body, url)
    values (new.holder_id, 'family_events', 'Qual cartão foi?',
            coalesce((select name from public.profiles where id = new.assigned_to), 'Alguém') || ' registrou '
              || private.brl(new.amount) || coalesce(' em ' || new.place, '') || ' no seu cartão',
            '/home?pendentes=1');
  end if;
  return new;
end $$;

create trigger transactions_notify_card_holder
  after insert on public.transactions
  for each row when (new.holder_id is not null)
  execute function private.notify_card_holder();

-- O titular escolhe o cartão: a compra entra na fatura, no nome de quem comprou, e o pendente sai.
-- Parcelas vêm de source_data (installments, current_installment, amount_is_installment).
create function public.resolve_card_pending(p_transaction uuid, p_wallet uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  t public.transactions;
  v_n integer;
  v_start integer;
  v_total bigint;
  v_base bigint;
  v_rest bigint;
  v_group uuid;
  k integer;
  v_data jsonb;
begin
  select * into t from public.transactions where id = p_transaction for update;
  if not found or t.status <> 'pending' or t.holder_id is null then
    raise exception 'Esta compra não está esperando o cartão.';
  end if;
  if t.holder_id <> v_uid then raise exception 'Só o titular escolhe o cartão.'; end if;
  if private.wallet_owner(p_wallet) is distinct from v_uid then raise exception 'Escolha um cartão seu.'; end if;
  if not private.has_wallet_access(p_wallet, t.assigned_to) then
    raise exception 'Este cartão não está compartilhado com quem fez a compra.';
  end if;

  v_n := greatest(coalesce((t.source_data->>'installments')::integer, 1), 1);
  v_start := least(greatest(coalesce((t.source_data->>'current_installment')::integer, 1), 1), v_n);
  v_total := case when coalesce((t.source_data->>'amount_is_installment')::boolean, false) then t.amount * v_n else t.amount end;
  v_data := coalesce(t.source_data, '{}'::jsonb) - 'card_unknown' - 'installments' - 'current_installment' - 'amount_is_installment';

  if v_n > 1 then
    insert into public.installment_groups (wallet_id, description, total_amount, installments_total, first_date)
    values (p_wallet, coalesce(t.place, ''), v_total, v_n, t.date)
    returning id into v_group;
  end if;

  v_base := v_total / v_n;
  v_rest := v_total - v_base * v_n;
  for k in v_start..v_n loop
    insert into public.transactions
      (type, amount, date, category_id, wallet_id, place, description, created_by, assigned_to,
       installment_group_id, installment_n, installments_total, source, status, source_data)
    values
      ('expense', v_base + case when k = 1 then v_rest else 0 end,
       (t.date + make_interval(months => k - 1))::date,
       t.category_id, p_wallet, t.place, t.description, t.created_by, t.assigned_to,
       v_group, case when v_n > 1 then k end, case when v_n > 1 then v_n end, t.source, 'confirmed', v_data);
  end loop;

  delete from public.transactions where id = t.id;

  if t.assigned_to <> v_uid then
    insert into public.notification_queue (user_id, kind, title, body, url)
    values (t.assigned_to, 'family_events', 'Cartão definido',
            coalesce((select name from public.profiles where id = v_uid), 'O titular') || ' lançou '
              || private.brl(t.amount) || coalesce(' em ' || t.place, '') || ' no '
              || (select name from public.wallets where id = p_wallet),
            '/transactions');
  end if;
end $$;

revoke execute on function public.resolve_card_pending(uuid, uuid) from public, anon;
grant execute on function public.resolve_card_pending(uuid, uuid) to authenticated;

-- "Compra no seu cartão": não avisa o titular da compra que ele mesmo lançou (ex.: ao escolher o cartão)
create or replace function private.notify_card_purchase() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  w public.wallets;
  v_name text;
begin
  if new.type <> 'expense' or new.status <> 'confirmed' or new.wallet_id is null then return new; end if;
  if new.installment_n is not null and new.installment_n > 1 then return new; end if;
  select * into w from public.wallets where id = new.wallet_id;
  if w.id is null or new.created_by is null or w.owner_id = new.created_by or w.owner_id = auth.uid() then return new; end if;
  select name into v_name from public.profiles where id = new.created_by;
  insert into public.notification_queue (user_id, kind, title, body, url)
  values (w.owner_id, 'family_events', 'Compra no seu cartão',
          coalesce(v_name, 'Um membro') || ' registrou ' || private.brl(
            case when new.installments_total is not null
                 then (select total_amount from public.installment_groups where id = new.installment_group_id)
                 else new.amount end)
          || coalesce(' em ' || new.place, '') || ' no ' || w.name,
          '/cards/' || w.id);
  return new;
end $$;
