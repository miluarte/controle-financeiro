-- Gasto fixo no cartão é lançado antes da data da cobrança (mês atual e seguinte).
-- Até a data chegar, o banco ainda não descontou do limite: "scheduled" soma esses lançamentos.
create or replace view public.invoice_totals with (security_invoker = true) as
select t.wallet_id, t.invoice_ref, t.assigned_to,
       sum(t.amount)::bigint as total, count(*)::int as purchases,
       coalesce(sum(t.amount) filter (where t.prepaid_by is not null), 0)::bigint as prepaid,
       coalesce(sum(t.amount) filter (
         where t.bill_id is not null and t.prepaid_by is null
           and t.date > (now() at time zone 'America/Sao_Paulo')::date
       ), 0)::bigint as scheduled
from public.transactions t
where t.type = 'expense' and t.status = 'confirmed' and t.invoice_ref is not null
group by t.wallet_id, t.invoice_ref, t.assigned_to;
