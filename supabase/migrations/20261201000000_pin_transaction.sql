-- Fixar um gasto: vira conta fixa sem fim a partir do mês dele (no cartão de crédito, cobrada sozinha
-- na fatura; nas outras carteiras, conta a pagar). O próprio gasto vira a ocorrência paga do mês,
-- então não é lançado de novo. Desfixar = encerrar a série a partir do mês seguinte (no app).
create function public.pin_transaction(p_transaction uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  t public.transactions;
  v_bill uuid;
  v_card uuid;
begin
  select * into t from public.transactions where id = p_transaction;
  if t.id is null or t.assigned_to is distinct from v_uid then raise exception 'Lançamento não encontrado.'; end if;
  if t.type <> 'expense' or t.status <> 'confirmed' then raise exception 'Só gastos confirmados podem ser fixados.'; end if;
  if t.installment_group_id is not null then raise exception 'Compra parcelada não vira conta fixa.'; end if;
  if t.bill_id is not null then raise exception 'Este gasto já é uma conta fixa.'; end if;

  v_card := case when t.wallet_id is not null and private.wallet_is_credit(t.wallet_id) then t.wallet_id end;
  insert into public.bills (user_id, type, name, amount, due_day, due_next_month, category_id, recurring, start_month, wallet_id)
  values (v_uid, 'expense',
          coalesce(nullif(t.place, ''), nullif(t.description, ''), (select name from public.categories where id = t.category_id), 'Conta fixa'),
          t.amount, extract(day from t.date)::smallint, false, t.category_id, true, private.month_start(t.date), v_card)
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

revoke execute on function public.pin_transaction(uuid) from public, anon;
grant execute on function public.pin_transaction(uuid) to authenticated;
