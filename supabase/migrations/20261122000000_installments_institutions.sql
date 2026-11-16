-- 1. Parcelas em andamento: a compra começa a ser lançada a partir da parcela p_start.
--    As parcelas anteriores já foram pagas antes de usar o app e não entram.
drop function if exists public.create_installment_purchase(uuid, uuid, bigint, integer, date, text, text, text, text);
create function public.create_installment_purchase(
  p_wallet uuid, p_category uuid, p_total bigint, p_installments integer, p_first_date date,
  p_place text default null, p_description text default null,
  p_source text default 'manual', p_status text default 'confirmed', p_start integer default 1
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_group uuid;
  v_base bigint;
  v_rest bigint;
  n integer;
begin
  if p_installments < 1 then raise exception 'Número de parcelas inválido.'; end if;
  if p_start < 1 or p_start > p_installments then raise exception 'Parcela atual inválida.'; end if;
  insert into public.installment_groups (wallet_id, description, total_amount, installments_total, first_date)
  values (p_wallet, coalesce(p_description, p_place, ''), p_total, p_installments, p_first_date)
  returning id into v_group;

  v_base := p_total / p_installments;
  v_rest := p_total - v_base * p_installments; -- centavos que sobram vão na 1ª parcela
  for n in p_start..p_installments loop
    insert into public.transactions
      (type, amount, date, category_id, wallet_id, place, description,
       installment_group_id, installment_n, installments_total, source, status)
    values
      ('expense', v_base + case when n = 1 then v_rest else 0 end,
       (p_first_date + make_interval(months => n - 1))::date,
       p_category, p_wallet, p_place, p_description, v_group, n, p_installments, p_source, p_status);
  end loop;
  return v_group;
end $$;
revoke execute on function public.create_installment_purchase(uuid, uuid, bigint, integer, date, text, text, text, text, integer) from public, anon;
grant execute on function public.create_installment_purchase(uuid, uuid, bigint, integer, date, text, text, text, text, integer) to authenticated;

-- 2. Instituições e regras de atraso do cartão.
-- Multa (até 2%, CDC art. 52) e IOF (0,38% + 0,0082% ao dia para pessoa física) são de lei.
-- Juros de mora de 1% a.m. é o padrão de mercado. Juros do rotativo variam por banco e por
-- cliente: vêm da fatura. Teto: juros e encargos do rotativo não passam de 100% da dívida (Lei 14.690/2023).
create table public.institutions (
  id               uuid primary key default gen_random_uuid(),
  name             text not null unique,
  revolving_rate   numeric(6,2),            -- juros do rotativo, % ao mês (null = informar pela fatura)
  installment_rate numeric(6,2),            -- juros do parcelamento de fatura, % ao mês
  late_interest    numeric(6,2) not null default 1,     -- juros de mora, % ao mês
  late_fine        numeric(6,2) not null default 2,     -- multa, %
  iof_daily        numeric(8,4) not null default 0.0082, -- % ao dia
  iof_additional   numeric(6,2) not null default 0.38,  -- % uma vez
  source           text,
  updated_at       timestamptz not null default now()
);
alter table public.institutions enable row level security;
create policy "everyone reads" on public.institutions for select to authenticated using (true);
grant select on public.institutions to authenticated;

insert into public.institutions (name, revolving_rate, installment_rate, source) values
  ('Mercado Pago', 17.90, 8.90, 'Fatura de nov/2026'),
  ('Nubank', null, null, null), ('Itaú', null, null, null), ('Bradesco', null, null, null),
  ('Santander', null, null, null), ('Banco do Brasil', null, null, null), ('Caixa', null, null, null),
  ('Inter', null, null, null), ('C6 Bank', null, null, null), ('PicPay', null, null, null),
  ('Banco Pan', null, null, null), ('Neon', null, null, null), ('Will Bank', null, null, null),
  ('XP', null, null, null), ('BTG Pactual', null, null, null), ('Sicredi', null, null, null),
  ('Sicoob', null, null, null), ('Porto Bank', null, null, null), ('Outra', null, null, null);

alter table public.wallets
  add column institution_id uuid references public.institutions(id) on delete set null,
  add column last4 text check (last4 ~ '^[0-9]{4}$'),
  add column revolving_rate numeric(6,2) check (revolving_rate >= 0); -- da fatura do cliente; vence o da instituição
create index on public.wallets (institution_id);
