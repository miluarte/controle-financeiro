-- "A receber de membros": só faturas que vencem até o fim do mês escolhido (inclui atrasadas),
-- sem as parcelas futuras. O acerto confirmado abate da própria fatura.
create or replace function public.month_summary(p_month date) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_start date := private.month_start(p_month);
  v_end date := (private.month_start(p_month) + interval '1 month')::date;
  v_carry boolean;
  r record;
  v_opening bigint := 0;
  v_closed bigint;
  v_receivable bigint;
begin
  select carry_over_balance into v_carry from public.profiles where id = v_uid;

  select
    coalesce(sum(amount) filter (where type = 'income'), 0) as income,
    coalesce(sum(amount) filter (where type = 'expense'), 0) as spending,
    coalesce(sum(amount) filter (where type = 'expense' and not private.wallet_is_credit(wallet_id)), 0) as cash_expense,
    coalesce(sum(amount) filter (where type = 'save_apply'), 0) as saved,
    coalesce(sum(amount) filter (where type = 'save_redeem'), 0) as redeemed,
    coalesce(sum(amount) filter (where type = 'invoice_payment'), 0) as invoice_paid,
    coalesce(sum(amount) filter (where type = 'settlement_payment'), 0) as settlement_paid,
    count(*) filter (where type = 'expense') as expense_count
  into r
  from public.transactions
  where assigned_to = v_uid and status = 'confirmed' and date >= v_start and date < v_end;

  if v_carry then
    select closing_balance into v_closed from public.monthly_closings
    where user_id = v_uid and ref_month = (v_start - interval '1 month')::date;
    if v_closed is not null then
      v_opening := v_closed;
    else
      select
        coalesce(sum(case
          when type in ('income', 'save_redeem') then amount
          when type = 'expense' and private.wallet_is_credit(wallet_id) then 0
          else -amount end), 0)
      into v_opening
      from public.transactions
      where assigned_to = v_uid and status = 'confirmed' and date < v_start;
    end if;
  end if;

  select coalesce(sum(greatest(it.total - coalesce((
           select sum(s.amount) from public.settlements s
           where s.wallet_id = it.wallet_id and s.invoice_ref = it.invoice_ref
             and s.debtor_id = it.assigned_to and s.status = 'confirmed'), 0), 0)), 0)
  into v_receivable
  from public.invoice_totals it
  join public.wallets w on w.id = it.wallet_id
  where w.owner_id = v_uid and it.assigned_to <> v_uid
    and private.invoice_due_date(it.wallet_id, it.invoice_ref) < v_end;

  return jsonb_build_object(
    'month', v_start,
    'income', r.income,
    'spending', r.spending,
    'expense_count', r.expense_count,
    'cash_expense', r.cash_expense,
    'saved', r.saved,
    'redeemed', r.redeemed,
    'invoice_paid', r.invoice_paid,
    'settlement_paid', r.settlement_paid,
    'opening_balance', v_opening,
    'balance', v_opening + r.income - r.cash_expense - r.saved + r.redeemed - r.invoice_paid - r.settlement_paid,
    'total_saved', (select coalesce(sum(case when type = 'save_apply' then amount else -amount end), 0)
                    from public.transactions
                    where assigned_to = v_uid and status = 'confirmed'
                      and type in ('save_apply', 'save_redeem') and date < v_end),
    'budget', (select total_amount from public.budgets where user_id = v_uid and ref_month = v_start),
    'receivable_from_members', greatest(v_receivable, 0),
    'pending_count', (select count(*) from public.transactions where assigned_to = v_uid and status = 'pending'),
    'closed', exists (select 1 from public.monthly_closings where user_id = v_uid and ref_month = v_start)
  );
end $$;
