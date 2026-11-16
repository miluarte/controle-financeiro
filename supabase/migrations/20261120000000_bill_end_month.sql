-- Recorrência com fim: último mês em que a conta ou receita fixa aparece (null = sem fim).
alter table public.bills
  add column end_month date check (end_month is null or extract(day from end_month) = 1);
alter table public.bills
  add constraint bills_end_after_start check (end_month is null or end_month >= start_month);

create or replace function public.ensure_bill_occurrences(p_month date)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_month date := private.month_start(p_month);
  b public.bills;
  v_offset integer;
  v_n integer;
  v_count integer := 0;
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
  end loop;
  return v_count;
end $$;
