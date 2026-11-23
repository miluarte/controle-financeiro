-- Gasto fixo com forma de pagamento e destinatário.
-- bills.wallet_id passa a valer para qualquer carteira: no cartão de crédito continua lançando sozinho na
-- fatura (ensure_bill_occurrences já confere wallet_is_credit); nas outras, é a carteira sugerida ao pagar.
-- bills.recipient guarda para quem vai o Pix ({user_id, name}, como transactions.source_data.sender).
-- Ao pagar, o gasto leva o destinatário; se for alguém da família, o gatilho pix_to_member gera o
-- "Pix para confirmar" dela. Também serve para gasto único a pagar depois (recurring = false).

alter table public.bills add column recipient jsonb;

comment on column public.bills.wallet_id is
  'Forma de pagamento. Cartão de crédito: lançado sozinho na fatura todo mês. Outras: sugerida ao pagar.';
comment on column public.bills.recipient is
  'Destinatário do Pix ({user_id, name}); vai para source_data.sender do gasto ao pagar.';

create or replace function public.pay_bill_occurrence(p_occurrence uuid, p_wallet uuid, p_date date default null)
returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  o public.bill_occurrences;
  b public.bills;
  v_tx uuid;
  v_n text;
begin
  select * into o from public.bill_occurrences where id = p_occurrence;
  if o.id is null then raise exception 'Conta não encontrada.'; end if;
  select * into b from public.bills where id = o.bill_id;
  if o.paid_at is not null then
    raise exception '%', case when b.type = 'income' then 'Esta receita já foi recebida.' else 'Esta conta já está paga.' end;
  end if;
  if b.type = 'income' and private.wallet_is_credit(p_wallet) then
    raise exception 'Receita não entra em cartão de crédito. Escolha outra carteira.';
  end if;
  v_n := case when o.installment_n is not null then o.installment_n || ' de ' || b.installments_total end;

  if b.type = 'income' then
    insert into public.transactions (type, amount, date, category_id, wallet_id, bill_id, description)
    values ('income', o.amount, coalesce(p_date, private.today_br()), b.category_id, p_wallet, b.id,
            b.name || coalesce(' · ' || v_n, ''))
    returning id into v_tx;
  else
    insert into public.transactions (type, amount, date, category_id, wallet_id, place, bill_id, description, source_data)
    values ('expense', o.amount, coalesce(p_date, private.today_br()), b.category_id, p_wallet, b.name, b.id, v_n,
            case when b.recipient is not null then jsonb_build_object('sender', b.recipient) end)
    returning id into v_tx;
  end if;

  update public.bill_occurrences set paid_at = coalesce(p_date, private.today_br()), transaction_id = v_tx
  where id = o.id;
  return v_tx;
end $$;

-- Fixar guarda também a carteira (qualquer tipo) e o destinatário do gasto.
create or replace function public.pin_transaction(p_transaction uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  t public.transactions;
  v_bill uuid;
begin
  select * into t from public.transactions where id = p_transaction;
  if t.id is null or t.assigned_to is distinct from v_uid then raise exception 'Lançamento não encontrado.'; end if;
  if t.type <> 'expense' or t.status <> 'confirmed' then raise exception 'Só gastos confirmados podem ser fixados.'; end if;
  if t.installment_group_id is not null then raise exception 'Compra parcelada não vira gasto fixo.'; end if;
  if t.bill_id is not null then raise exception 'Este gasto já é fixo.'; end if;

  insert into public.bills (user_id, type, name, amount, due_day, due_next_month, category_id, recurring, start_month, wallet_id, recipient)
  values (v_uid, 'expense',
          coalesce(nullif(t.place, ''), nullif(t.description, ''), (select name from public.categories where id = t.category_id), 'Gasto fixo'),
          t.amount, extract(day from t.date)::smallint, false, t.category_id, true, private.month_start(t.date),
          case when t.wallet_id is not null and private.has_wallet_access(t.wallet_id, v_uid) then t.wallet_id end,
          case when jsonb_typeof(t.source_data->'sender') = 'object' then t.source_data->'sender' end)
  returning id into v_bill;

  insert into public.bill_occurrences (bill_id, user_id, ref_month, amount, due_date, paid_at, transaction_id)
  values (v_bill, v_uid, private.month_start(t.date), t.amount, t.date, t.date, t.id);

  -- marca o gasto como da conta (pode falhar em fatura fechada de cartão de outra pessoa; a ocorrência já liga os dois)
  begin
    update public.transactions set bill_id = v_bill where id = t.id;
  exception when others then null;
  end;
  return v_bill;
end $$;
