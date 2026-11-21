-- Acerto informado e ainda não confirmado pelo titular aparece para o membro (my_card_debts.reported),
-- e não dá para informar mais do que falta (evita acerto em dobro por toque repetido).

drop function public.my_card_debts();
create function public.my_card_debts()
returns table (wallet_id uuid, invoice_ref date, due_date date, total bigint, settled bigint, open bigint, reported bigint)
language sql stable security invoker set search_path = '' as $$
  select it.wallet_id, it.invoice_ref, private.invoice_due_date(it.wallet_id, it.invoice_ref),
         it.total,
         coalesce(s.confirmed, 0)::bigint,
         greatest(it.total - coalesce(s.confirmed, 0), 0)::bigint,
         coalesce(s.reported, 0)::bigint
  from public.invoice_totals it
  left join lateral (
    select sum(x.amount) filter (where x.status = 'confirmed') as confirmed,
           sum(x.amount) filter (where x.status = 'reported') as reported
    from public.settlements x
    where x.wallet_id = it.wallet_id and x.invoice_ref = it.invoice_ref
      and x.debtor_id = (select auth.uid()) and x.status in ('confirmed', 'reported')
  ) s on true
  where it.assigned_to = (select auth.uid())
    and private.wallet_owner(it.wallet_id) is distinct from (select auth.uid())
  order by it.invoice_ref
$$;
revoke execute on function public.my_card_debts() from public, anon;
grant execute on function public.my_card_debts() to authenticated;

create or replace function public.report_settlement(
  p_wallet uuid, p_invoice_ref date, p_amount bigint, p_from_wallet uuid, p_date date
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_holder uuid := private.wallet_owner(p_wallet);
  v_ref date := private.month_start(p_invoice_ref);
  v_total bigint;
  v_done bigint;
  v_tx uuid;
  v_id uuid;
  v_name text;
  v_card text;
begin
  if v_uid is null then raise exception 'Não autenticado'; end if;
  if v_holder is null or v_holder = v_uid then raise exception 'Cartão inválido para acerto.'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Informe o valor.'; end if;
  if private.wallet_owner(p_from_wallet) is distinct from v_uid or private.wallet_is_credit(p_from_wallet) then
    raise exception 'Escolha uma carteira sua (Pix, débito ou dinheiro).';
  end if;
  if not exists (select 1 from public.transactions
                 where wallet_id = p_wallet and assigned_to = v_uid and type = 'expense') then
    raise exception 'Você não tem compras neste cartão.';
  end if;

  -- trava por membro e cartão: dois toques seguidos não passam juntos pela conta abaixo
  perform pg_advisory_xact_lock(hashtext(p_wallet::text || v_uid::text));
  select coalesce(sum(total), 0) into v_total from public.invoice_totals
   where wallet_id = p_wallet and invoice_ref = v_ref and assigned_to = v_uid;
  select coalesce(sum(amount), 0) into v_done from public.settlements
   where wallet_id = p_wallet and invoice_ref = v_ref and debtor_id = v_uid and status in ('confirmed', 'reported');
  if p_amount > v_total - v_done then
    if v_total - v_done <= 0 then raise exception 'Esta fatura já foi toda informada. Aguarde a confirmação.'; end if;
    raise exception 'Falta informar só %.', private.brl(v_total - v_done);
  end if;

  insert into public.transactions (type, amount, date, wallet_id, to_wallet_id, invoice_ref, description, created_by, assigned_to)
  values ('settlement_payment', p_amount, coalesce(p_date, private.today_br()), p_from_wallet, null, v_ref,
          'Acerto de cartão', v_uid, v_uid)
  returning id into v_tx;

  insert into public.settlements (wallet_id, debtor_id, holder_id, invoice_ref, amount, status, reported_at, debtor_transaction_id)
  values (p_wallet, v_uid, v_holder, v_ref, p_amount, 'reported', now(), v_tx)
  returning id into v_id;

  select name into v_name from public.profiles where id = v_uid;
  select name into v_card from public.wallets where id = p_wallet;
  insert into public.notification_queue (user_id, kind, title, body, url)
  values (v_holder, 'family_events', 'Pagamento para confirmar',
          coalesce(v_name, 'Um membro') || ' informou que pagou ' || private.brl(p_amount) || ' da fatura do ' || v_card,
          '/cards/' || p_wallet);
  return v_id;
end $$;
