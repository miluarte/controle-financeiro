-- 1. Pagar uma compra do cartão antes da fatura fechar (inteira ou uma parcela).
--    O pagamento sai do caixa na data escolhida e abate o valor da fatura daquela compra.
alter table public.transactions
  add column prepaid_by uuid references public.transactions(id) on delete set null;
create index on public.transactions (prepaid_by);

create or replace view public.invoice_totals with (security_invoker = true) as
select t.wallet_id, t.invoice_ref, t.assigned_to,
       sum(t.amount)::bigint as total, count(*)::int as purchases,
       coalesce(sum(t.amount) filter (where t.prepaid_by is not null), 0)::bigint as prepaid
from public.transactions t
where t.type = 'expense' and t.status = 'confirmed' and t.invoice_ref is not null
group by t.wallet_id, t.invoice_ref, t.assigned_to;

create or replace function public.pay_invoice(
  p_card uuid, p_ref date, p_from_wallet uuid, p_date date default null, p_amount bigint default null
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_ref date := private.month_start(p_ref);
  v_amount bigint;
  v_tx uuid;
begin
  if private.wallet_owner(p_card) is distinct from auth.uid() then
    raise exception 'Só o titular paga a fatura.';
  end if;
  -- o que já foi pago antes (compras antecipadas) não entra de novo
  v_amount := coalesce(p_amount,
    (select sum(total - prepaid) from public.invoice_totals where wallet_id = p_card and invoice_ref = v_ref));
  if coalesce(v_amount, 0) <= 0 then raise exception 'Fatura sem valor.'; end if;

  insert into public.transactions (type, amount, date, wallet_id, to_wallet_id, invoice_ref, description)
  values ('invoice_payment', v_amount, coalesce(p_date, private.today_br()), p_from_wallet, p_card, v_ref, 'Pagamento de fatura')
  returning id into v_tx;

  insert into public.invoices (wallet_id, ref_month, closing_date, due_date, paid_at, payment_transaction_id)
  values (p_card, v_ref, private.invoice_closing_date(p_card, v_ref), private.invoice_due_date(p_card, v_ref),
          coalesce(p_date, private.today_br()), v_tx)
  on conflict (wallet_id, ref_month) do update
    set paid_at = excluded.paid_at, payment_transaction_id = excluded.payment_transaction_id;
  return v_tx;
end $$;

create function public.prepay_purchase(p_transaction uuid, p_from_wallet uuid, p_date date default null)
returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  t public.transactions;
  v_tx uuid;
begin
  select * into t from public.transactions where id = p_transaction;
  if t.id is null or t.type <> 'expense' or t.invoice_ref is null then raise exception 'Só compras no cartão de crédito.'; end if;
  if private.wallet_owner(t.wallet_id) is distinct from auth.uid() then raise exception 'Só o titular do cartão.'; end if;
  if t.prepaid_by is not null then raise exception 'Esta compra já foi paga.'; end if;
  if private.invoice_is_paid(t.wallet_id, t.invoice_ref) then raise exception 'A fatura desta compra já foi paga.'; end if;
  if private.wallet_is_credit(p_from_wallet) then raise exception 'Escolha Pix, débito ou dinheiro.'; end if;

  insert into public.transactions (type, amount, date, wallet_id, to_wallet_id, invoice_ref, description)
  values ('invoice_payment', t.amount, coalesce(p_date, private.today_br()), p_from_wallet, t.wallet_id, t.invoice_ref,
          'Pagamento antecipado: ' || coalesce(t.place, 'compra')
            || coalesce(' (' || t.installment_n || '/' || t.installments_total || ')', ''))
  returning id into v_tx;
  update public.transactions set prepaid_by = v_tx where id = t.id;
  return v_tx;
end $$;

create function public.undo_prepay_purchase(p_transaction uuid) returns void
language plpgsql security invoker set search_path = '' as $$
declare t public.transactions;
begin
  select * into t from public.transactions where id = p_transaction;
  if t.id is null or t.prepaid_by is null then return; end if;
  if private.invoice_is_paid(t.wallet_id, t.invoice_ref) then raise exception 'A fatura já foi paga.'; end if;
  delete from public.transactions where id = t.prepaid_by; -- prepaid_by vira null pela FK
end $$;

revoke execute on function public.prepay_purchase(uuid, uuid, date) from public, anon;
revoke execute on function public.undo_prepay_purchase(uuid) from public, anon;
grant execute on function public.prepay_purchase(uuid, uuid, date) to authenticated;
grant execute on function public.undo_prepay_purchase(uuid) to authenticated;

-- 2. Taxas médias de cada banco por produto, do Banco Central (atualizadas toda semana pela
--    Edge Function `taxas-bcb`). Servem de base para o simulador e para o atraso do cartão
--    quando a pessoa não informou a taxa da fatura.
alter table public.institutions
  add column bcb_names text[] not null default '{}',  -- nomes no BCB, em ordem de preferência
  add column priority integer not null default 100;   -- menor aparece primeiro

update public.institutions set name = 'Porto Seguro' where name = 'Porto Bank';
update public.institutions i set bcb_names = v.names, priority = v.prio
from (values
  ('Nubank', array['NU FINANCEIRA S.A. CFI', 'NU PAGAMENTOS S.A.'], 1),
  ('Santander', array['BCO SANTANDER (BRASIL) S.A.'], 2),
  ('Porto Seguro', array['PORTOSEG S.A. CFI'], 3),
  ('Caixa', array['CAIXA ECONOMICA FEDERAL'], 4),
  ('Mercado Pago', array['MERCADO CRÉDITO SCFI S.A.', 'MERCADO PAGO IP LTDA.'], 5),
  ('Itaú', array['ITAÚ UNIBANCO HOLDING S.A.', 'ITAÚ UNIBANCO S.A.'], 6),
  ('Bradesco', array['BCO BRADESCO S.A.', 'BCO BRADESCARD S.A.'], 20),
  ('Banco do Brasil', array['BCO DO BRASIL S.A.'], 20),
  ('Inter', array['BCO INTER S.A.', 'BANCO INTER'], 20),
  ('C6 Bank', array['BCO C6 S.A.'], 20),
  ('PicPay', array['PICPAY BANK - BANCO MÚLTIPLO S.A', 'PICPAY'], 20),
  ('Banco Pan', array['BANCO PAN'], 20),
  ('Neon', array['NEON'], 20),
  ('Will Bank', array['BANCO WILL S.A.', 'WILL FINANCEIRA'], 20),
  ('XP', array['BCO XP S.A.'], 20),
  ('BTG Pactual', array['BCO BTG PACTUAL S.A.'], 20),
  ('Sicredi', array['BCO COOPERATIVO SICREDI S.A.'], 20),
  ('Sicoob', array['BANCO SICOOB S.A.'], 20),
  ('Outra', array[]::text[], 999)
) v(name, names, prio)
where i.name = v.name;

create table public.institution_rates (
  institution_id uuid not null references public.institutions(id) on delete cascade,
  product        text not null check (product in ('card_revolving', 'card_installment', 'overdraft', 'personal_loan',
                   'payroll_inss', 'payroll_private', 'payroll_public', 'vehicle', 'other_goods')),
  monthly_rate   numeric(7,2) not null,
  period_start   date not null,
  period_end     date not null,
  bcb_name       text not null,
  updated_at     timestamptz not null default now(),
  primary key (institution_id, product)
);
alter table public.institution_rates enable row level security;
create policy "everyone reads" on public.institution_rates for select to authenticated using (true);
grant select on public.institution_rates to authenticated;

-- toda segunda às 6h17 (horário de Brasília = 9h17 UTC)
select cron.schedule('troco-bcb-rates', '17 9 * * 1', $cron$
  select net.http_post(
    url := 'https://ievipjugroamsrxolvip.supabase.co/functions/v1/taxas-bcb',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron-secret', (select value from private.app_secrets where name = 'cron_secret')),
    body := '{}'::jsonb, timeout_milliseconds := 120000);
$cron$);
