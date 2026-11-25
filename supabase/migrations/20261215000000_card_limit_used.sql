-- Limite usado do cartão: tudo o que ainda não foi pago, de todas as pessoas.
-- Entra a fatura fechada e não paga (ou paga em parte) e as parcelas futuras.
-- Saem as faturas pagas, o que já foi pago em parte, as compras antecipadas
-- e os gastos fixos com data futura (o banco só desconta do limite quando cobra).
create or replace view public.card_limit_used with (security_invoker = true) as
with inv as (
  select wallet_id, invoice_ref,
         sum(total)::bigint as total, sum(prepaid)::bigint as prepaid, sum(scheduled)::bigint as scheduled
  from public.invoice_totals
  group by wallet_id, invoice_ref
)
select i.wallet_id,
       sum(greatest(i.total - i.prepaid - i.scheduled - coalesce(p.paid, 0), 0))::bigint as used
from inv i
join public.wallets w on w.id = i.wallet_id and w.type = 'credit'
left join public.invoices v on v.wallet_id = i.wallet_id and v.ref_month = i.invoice_ref
left join public.invoice_paid p on p.wallet_id = i.wallet_id and p.invoice_ref = i.invoice_ref
where v.paid_at is null
group by i.wallet_id;

grant select on public.card_limit_used to authenticated;
