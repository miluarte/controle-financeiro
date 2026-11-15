-- Receita fixa (salário, aluguel recebido): a mesma série mensal de bills/bill_occurrences,
-- com type = 'income'. Marcar como recebida gera uma receita em vez de gasto.

alter table public.bills
  add column type text not null default 'expense' check (type in ('expense', 'income'));

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
    insert into public.transactions (type, amount, date, category_id, wallet_id, place, bill_id, description)
    values ('expense', o.amount, coalesce(p_date, private.today_br()), b.category_id, p_wallet, b.name, b.id, v_n)
    returning id into v_tx;
  end if;

  update public.bill_occurrences set paid_at = coalesce(p_date, private.today_br()), transaction_id = v_tx
  where id = o.id;
  return v_tx;
end $$;
