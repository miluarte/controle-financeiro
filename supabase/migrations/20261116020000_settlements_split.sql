-- 5.7.8 Acerto entre membro e titular e ATR-5 Divisão de compra.
-- Toda escrita em settlements passa pelas RPCs abaixo (o membro não pode se auto-confirmar).

drop policy if exists "settlements parties insert" on public.settlements;
drop policy if exists "settlements parties update" on public.settlements;

-- 1. Membro informa que pagou ao titular. Registra a saída de caixa dele (sem gerar gasto)
--    e deixa o acerto aguardando confirmação.
create function public.report_settlement(
  p_wallet uuid, p_invoice_ref date, p_amount bigint, p_from_wallet uuid, p_date date
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_holder uuid := public.wallet_owner(p_wallet);
  v_ref date := public.month_start(p_invoice_ref);
  v_tx uuid;
  v_id uuid;
  v_name text;
  v_card text;
begin
  if v_uid is null then raise exception 'Não autenticado'; end if;
  if v_holder is null or v_holder = v_uid then raise exception 'Cartão inválido para acerto.'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Informe o valor.'; end if;
  if public.wallet_owner(p_from_wallet) is distinct from v_uid or public.wallet_is_credit(p_from_wallet) then
    raise exception 'Escolha uma carteira sua (Pix, débito ou dinheiro).';
  end if;
  if not exists (select 1 from public.transactions
                 where wallet_id = p_wallet and assigned_to = v_uid and type = 'expense') then
    raise exception 'Você não tem compras neste cartão.';
  end if;

  insert into public.transactions (type, amount, date, wallet_id, to_wallet_id, invoice_ref, description, created_by, assigned_to)
  values ('settlement_payment', p_amount, coalesce(p_date, public.today_br()), p_from_wallet, null, v_ref,
          'Acerto de cartão', v_uid, v_uid)
  returning id into v_tx;

  insert into public.settlements (wallet_id, debtor_id, holder_id, invoice_ref, amount, status, reported_at, debtor_transaction_id)
  values (p_wallet, v_uid, v_holder, v_ref, p_amount, 'reported', now(), v_tx)
  returning id into v_id;

  select name into v_name from public.profiles where id = v_uid;
  select name into v_card from public.wallets where id = p_wallet;
  insert into public.notification_queue (user_id, kind, title, body, url)
  values (v_holder, 'family_events', 'Pagamento para confirmar',
          coalesce(v_name, 'Um membro') || ' informou que pagou ' || public.brl(p_amount) || ' da fatura do ' || v_card,
          '/cards/' || p_wallet);
  return v_id;
end $$;

-- 2. Titular confirma. O valor entra para ele como receita (Reembolso) e a fatura daquele membro fica quitada.
create function public.confirm_settlement(p_settlement uuid, p_to_wallet uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  s public.settlements;
  v_tx uuid;
  v_name text;
begin
  select * into s from public.settlements where id = p_settlement;
  if s.id is null or s.holder_id is distinct from v_uid then raise exception 'Acerto não encontrado.'; end if;
  if s.status <> 'reported' then raise exception 'Este acerto já foi tratado.'; end if;
  if public.wallet_owner(p_to_wallet) is distinct from v_uid or public.wallet_is_credit(p_to_wallet) then
    raise exception 'Escolha uma carteira sua para receber.';
  end if;

  select name into v_name from public.profiles where id = s.debtor_id;
  insert into public.transactions (type, amount, date, wallet_id, category_id, description, created_by, assigned_to)
  values ('income', s.amount, public.today_br(), p_to_wallet,
          (select id from public.categories where user_id = v_uid and type = 'income' and name = 'Reembolso' limit 1),
          'Acerto de ' || coalesce(v_name, 'membro'), v_uid, v_uid)
  returning id into v_tx;

  update public.settlements set status = 'confirmed', confirmed_at = now(), holder_transaction_id = v_tx where id = s.id;

  insert into public.notification_queue (user_id, kind, title, body, url)
  values (s.debtor_id, 'family_events', 'Pagamento confirmado',
          'Seu acerto de ' || public.brl(s.amount) || ' foi confirmado.', '/cards/' || s.wallet_id);
end $$;

-- 3. Titular recusa: some o acerto e a saída de caixa que o membro tinha registrado.
create function public.reject_settlement(p_settlement uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  s public.settlements;
begin
  select * into s from public.settlements where id = p_settlement;
  if s.id is null or s.holder_id is distinct from auth.uid() then raise exception 'Acerto não encontrado.'; end if;
  if s.status <> 'reported' then raise exception 'Este acerto já foi tratado.'; end if;
  delete from public.settlements where id = s.id;
  delete from public.transactions where id = s.debtor_transaction_id;
  insert into public.notification_queue (user_id, kind, title, body, url)
  values (s.debtor_id, 'family_events', 'Pagamento não confirmado',
          'O titular não confirmou o acerto de ' || public.brl(s.amount) || '. Fale com ele.', '/cards/' || s.wallet_id);
end $$;

-- 4. Membro desiste enquanto aguarda confirmação.
create function public.cancel_settlement(p_settlement uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  s public.settlements;
begin
  select * into s from public.settlements where id = p_settlement;
  if s.id is null or s.debtor_id is distinct from auth.uid() then raise exception 'Acerto não encontrado.'; end if;
  if s.status <> 'reported' then raise exception 'Este acerto já foi confirmado.'; end if;
  delete from public.settlements where id = s.id;
  delete from public.transactions where id = s.debtor_transaction_id;
end $$;

-- ATR-5: o titular divide uma compra entre pessoas. A compra original fica com a primeira parte
-- e as demais viram compras irmãs no mesmo cartão e na mesma data. Só compra à vista, com fatura em aberto.
-- p_parts: [{"user_id": "...", "amount": 1234}, ...] somando o valor original.
create function public.split_purchase(p_transaction uuid, p_parts jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  t public.transactions;
  v_uid uuid := auth.uid();
  v_total bigint;
  v_part jsonb;
  v_first boolean := true;
  v_user uuid;
  v_amount bigint;
  v_card text;
  n integer := 0;
begin
  select * into t from public.transactions where id = p_transaction;
  if t.id is null or public.wallet_owner(t.wallet_id) is distinct from v_uid then
    raise exception 'Só o titular do cartão divide a compra.';
  end if;
  if t.type <> 'expense' or t.installment_group_id is not null then
    raise exception 'Só dá para dividir compra à vista.';
  end if;
  if t.invoice_ref is not null and public.invoice_is_paid(t.wallet_id, t.invoice_ref) then
    raise exception 'Fatura já quitada.';
  end if;
  if jsonb_array_length(p_parts) < 2 then raise exception 'Escolha pelo menos duas pessoas.'; end if;
  select sum((x->>'amount')::bigint) into v_total from jsonb_array_elements(p_parts) x;
  if v_total <> t.amount then raise exception 'As partes precisam somar o valor da compra.'; end if;

  select name into v_card from public.wallets where id = t.wallet_id;
  for v_part in select * from jsonb_array_elements(p_parts) loop
    v_user := (v_part->>'user_id')::uuid;
    v_amount := (v_part->>'amount')::bigint;
    if v_amount <= 0 then raise exception 'Cada parte precisa ter valor.'; end if;
    if not public.has_wallet_access(t.wallet_id, v_user) then raise exception 'Pessoa sem acesso ao cartão.'; end if;
    if v_first then
      -- categoria é de cada pessoa: a parte de outra pessoa fica sem categoria até ela escolher
      update public.transactions set amount = v_amount, assigned_to = v_user,
        category_id = case when v_user = v_uid then t.category_id end,
        source_data = coalesce(source_data, '{}'::jsonb) || jsonb_build_object('split_total', t.amount)
      where id = t.id;
      v_first := false;
    else
      insert into public.transactions (type, amount, date, wallet_id, category_id, place, description,
        created_by, assigned_to, source, source_data)
      values ('expense', v_amount, t.date, t.wallet_id, case when v_user = v_uid then t.category_id end, t.place, t.description,
        v_uid, v_user, t.source, jsonb_build_object('split_of', t.id, 'split_total', t.amount));
      -- a primeira parte já é avisada pelo trigger de atribuição
      if v_user <> v_uid then
        insert into public.notification_queue (user_id, kind, title, body, url)
        values (v_user, 'family_events', 'Parte de uma compra para você',
                public.brl(v_amount) || coalesce(' em ' || t.place, '') || ' no ' || v_card, '/cards/' || t.wallet_id);
      end if;
    end if;
    n := n + 1;
  end loop;
  return n;
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.report_settlement(uuid, date, bigint, uuid, date)',
    'public.confirm_settlement(uuid, uuid)',
    'public.reject_settlement(uuid)',
    'public.cancel_settlement(uuid)',
    'public.split_purchase(uuid, jsonb)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
