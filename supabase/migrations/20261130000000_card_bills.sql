-- Conta fixa cobrada no cartão (assinatura): bills.wallet_id aponta para um cartão de crédito.
-- Todo mês, ao gerar a ocorrência, o gasto entra sozinho no cartão (e na fatura) e a ocorrência fica paga.
-- No app, essas contas não aparecem como conta a pagar à parte: ficam dentro da fatura.
alter table public.bills add column wallet_id uuid references public.wallets(id) on delete set null;
alter table public.bills add constraint bills_wallet_expense_check check (wallet_id is null or type = 'expense');

comment on column public.bills.wallet_id is 'Cartão de crédito onde a conta é cobrada todo mês (assinatura); null = paga à parte.';

create or replace function public.ensure_bill_occurrences(p_month date) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_month date := private.month_start(p_month);
  b public.bills;
  o public.bill_occurrences;
  v_offset integer;
  v_n integer;
  v_count integer := 0;
  v_tx uuid;
begin
  for b in
    select * from public.bills
    where active and start_month <= v_month and (end_month is null or end_month >= v_month)
      and (v_uid is null or user_id = v_uid)
  loop
    v_offset := (extract(year from v_month) - extract(year from b.start_month)) * 12
              + (extract(month from v_month) - extract(month from b.start_month));
    v_n := null;
    if b.installments_total is not null then
      v_n := b.installment_current + v_offset;
      if v_n > b.installments_total then
        update public.bills set active = false where id = b.id;
        continue;
      end if;
    elsif not b.recurring and v_offset > 0 then
      continue;
    end if;

    insert into public.bill_occurrences (bill_id, user_id, ref_month, installment_n, amount, due_date)
    values (b.id, b.user_id, v_month, v_n, b.amount,
            private.clamp_day((v_month + case when b.due_next_month then interval '1 month' else interval '0' end)::date, b.due_day))
    on conflict (bill_id, ref_month) do nothing;
    if found then v_count := v_count + 1; end if;

    -- cobrada no cartão: lança o gasto no cartão na data da conta e marca a ocorrência como paga
    if b.wallet_id is not null and b.type = 'expense'
       and private.wallet_is_credit(b.wallet_id) and private.has_wallet_access(b.wallet_id, b.user_id) then
      select * into o from public.bill_occurrences where bill_id = b.id and ref_month = v_month;
      if o.id is not null and o.paid_at is null then
        insert into public.transactions (type, amount, date, category_id, wallet_id, place, bill_id, description, created_by, assigned_to)
        values ('expense', o.amount, o.due_date, b.category_id, b.wallet_id, b.name, b.id,
                case when o.installment_n is not null then o.installment_n || ' de ' || b.installments_total end,
                b.user_id, b.user_id)
        returning id into v_tx;
        update public.bill_occurrences set paid_at = o.due_date, transaction_id = v_tx where id = o.id;
      end if;
    end if;
  end loop;
  return v_count;
end $$;
