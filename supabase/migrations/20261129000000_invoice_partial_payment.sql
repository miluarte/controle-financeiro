-- Pagamento parcial da fatura do próprio cartão: cada pagamento é um invoice_payment; a fatura só
-- fica paga (invoices.paid_at) quando a soma dos pagamentos cobre o valor a pagar. O resto é saldo devedor.
-- quanto já foi pago de cada fatura, sem os pagamentos antecipados de compra (esses já saem como "prepaid")
create view public.invoice_paid with (security_invoker = true) as
  select p.to_wallet_id as wallet_id, p.invoice_ref, sum(p.amount)::bigint as paid
  from public.transactions p
  where p.type = 'invoice_payment' and p.to_wallet_id is not null and p.invoice_ref is not null
    and not exists (select 1 from public.transactions e where e.prepaid_by = p.id)
  group by p.to_wallet_id, p.invoice_ref;

grant select on public.invoice_paid to authenticated;

create or replace function public.pay_invoice(p_card uuid, p_ref date, p_from_wallet uuid, p_date date default null, p_amount bigint default null)
returns uuid
language plpgsql set search_path = '' as $$
declare
  v_ref date := private.month_start(p_ref);
  v_due bigint;
  v_paid bigint;
  v_amount bigint;
  v_tx uuid;
begin
  if private.wallet_owner(p_card) is distinct from auth.uid() then
    raise exception 'Só o titular paga a fatura.';
  end if;
  select coalesce(sum(total - prepaid), 0) into v_due from public.invoice_totals where wallet_id = p_card and invoice_ref = v_ref;
  select coalesce(sum(paid), 0) into v_paid from public.invoice_paid where wallet_id = p_card and invoice_ref = v_ref;
  v_amount := coalesce(p_amount, v_due - v_paid);
  if coalesce(v_amount, 0) <= 0 then raise exception 'Fatura sem valor a pagar.'; end if;

  insert into public.transactions (type, amount, date, wallet_id, to_wallet_id, invoice_ref, description)
  values ('invoice_payment', v_amount, coalesce(p_date, private.today_br()), p_from_wallet, p_card, v_ref, 'Pagamento de fatura')
  returning id into v_tx;

  insert into public.invoices (wallet_id, ref_month, closing_date, due_date, paid_at, payment_transaction_id)
  values (p_card, v_ref, private.invoice_closing_date(p_card, v_ref), private.invoice_due_date(p_card, v_ref),
          case when v_paid + v_amount >= v_due then coalesce(p_date, private.today_br()) end, v_tx)
  on conflict (wallet_id, ref_month) do update
    set paid_at = excluded.paid_at, payment_transaction_id = excluded.payment_transaction_id;
  return v_tx;
end $$;

-- Desfaz todos os pagamentos de uma fatura do próprio cartão.
create function public.unpay_invoice(p_card uuid, p_ref date) returns void
language plpgsql set search_path = '' as $$
declare
  v_ref date := private.month_start(p_ref);
begin
  if private.wallet_owner(p_card) is distinct from auth.uid() then
    raise exception 'Só o titular mexe no pagamento da fatura.';
  end if;
  update public.invoices set paid_at = null, payment_transaction_id = null where wallet_id = p_card and ref_month = v_ref;
  delete from public.transactions p where p.type = 'invoice_payment' and p.to_wallet_id = p_card and p.invoice_ref = v_ref
    and not exists (select 1 from public.transactions e where e.prepaid_by = p.id);
end $$;

revoke execute on function public.unpay_invoice(uuid, date) from public, anon;
grant execute on function public.unpay_invoice(uuid, date) to authenticated;
