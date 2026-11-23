-- Gasto fixo: excluir só um mês e excluir o lançamento do pagamento.
-- bill_occurrences.skipped: o mês foi excluído ("Só este mês"). A ocorrência continua existindo, para
-- ensure_bill_occurrences não gerar de novo, e fica com paid_at preenchido, para não avisar vencimento nem
-- ser lançada no cartão. O app não mostra ocorrência pulada.
alter table public.bill_occurrences add column skipped boolean not null default false;

comment on column public.bill_occurrences.skipped is
  'Mês excluído só desta vez ("Só este mês"). Fica com paid_at para não avisar nem lançar no cartão.';

-- Lançamento do pagamento excluído: a conta do mês volta a ficar a pagar. No cartão (lançada sozinha),
-- o mês fica pulado, senão o lançamento voltaria no próximo ensure_bill_occurrences.
create or replace function private.bill_payment_deleted() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.bill_occurrences o
     set paid_at = case when b.wallet_id is not null and private.wallet_is_credit(b.wallet_id) then o.paid_at end,
         skipped = o.skipped or (b.wallet_id is not null and private.wallet_is_credit(b.wallet_id)),
         transaction_id = null
    from public.bills b
   where o.transaction_id = old.id and b.id = o.bill_id;
  return old;
end $$;

drop trigger if exists transactions_bill_payment_deleted on public.transactions;
create trigger transactions_bill_payment_deleted
  before delete on public.transactions
  for each row execute function private.bill_payment_deleted();

-- Ocorrências pagas que perderam o lançamento (excluído antes deste gatilho) voltam a ficar a pagar,
-- menos as do cartão, que ficam puladas.
update public.bill_occurrences o
   set paid_at = case when b.wallet_id is not null and private.wallet_is_credit(b.wallet_id) then o.paid_at end,
       skipped = b.wallet_id is not null and private.wallet_is_credit(b.wallet_id)
  from public.bills b
 where b.id = o.bill_id and o.paid_at is not null and o.transaction_id is null and not o.skipped;
