-- Dividir compra no cartão de crédito (5.7, ATR-5 ampliado):
-- quem fez a compra também divide (não só o titular), compra parcelada também (cada parcela em aberto
-- é dividida na mesma proporção) e os itens guardam de quem são (source_data.items[].owner: id da pessoa ou
-- 'split', item dividido entre todos; item sem dono fica com quem guarda o lançamento original).
-- As partes valem como proporção do valor da compra. A parte de quem divide fica no lançamento original
-- (com categoria e itens); as outras viram lançamentos novos, sem categoria (categoria é de cada um).

drop function if exists public.split_purchase(uuid, jsonb);

create function public.split_purchase(p_transaction uuid, p_parts jsonb, p_items jsonb default null)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  t public.transactions;
  r public.transactions;
  v_uid uuid := auth.uid();
  v_psum bigint;
  v_keeper uuid;
  v_part jsonb;
  v_user uuid;
  v_share bigint;
  v_left bigint;
  v_card text;
  v_groups jsonb := '{}'::jsonb;
  v_group uuid;
  v_items jsonb;
  v_total bigint;
  n integer := 0;
begin
  select * into t from public.transactions where id = p_transaction;
  if t.id is null then raise exception 'Compra não encontrada.'; end if;
  if private.wallet_owner(t.wallet_id) is distinct from v_uid and t.assigned_to is distinct from v_uid then
    raise exception 'Só quem fez a compra ou o titular do cartão divide.';
  end if;
  if t.type <> 'expense' or not private.wallet_is_credit(t.wallet_id) then
    raise exception 'Só dá para dividir compra no cartão de crédito.';
  end if;
  if jsonb_array_length(p_parts) < 2 then raise exception 'Escolha pelo menos duas pessoas.'; end if;
  select sum((x->>'amount')::bigint) into v_psum from jsonb_array_elements(p_parts) x;
  if coalesce(v_psum, 0) <= 0 then raise exception 'Informe as partes.'; end if;

  for v_part in select * from jsonb_array_elements(p_parts) loop
    v_user := (v_part->>'user_id')::uuid;
    if (v_part->>'amount')::bigint < 0 then raise exception 'Parte com valor inválido.'; end if;
    if private.wallet_owner(t.wallet_id) is distinct from v_user and not private.has_wallet_access(t.wallet_id, v_user) then
      raise exception 'Pessoa sem acesso ao cartão.';
    end if;
  end loop;

  -- quem fica com o lançamento original: quem divide, se tiver parte; senão a primeira pessoa com parte
  select (x->>'user_id')::uuid into v_keeper from jsonb_array_elements(p_parts) x
   where (x->>'amount')::bigint > 0
   order by ((x->>'user_id')::uuid = v_uid) desc limit 1;

  -- total da compra inteira (para a parcelada, a soma das parcelas lançadas)
  v_total := case when t.installment_group_id is null then t.amount
    else (select sum(amount) from public.transactions where installment_group_id = t.installment_group_id) end;

  select name into v_card from public.wallets where id = t.wallet_id;

  for r in
    select * from public.transactions x
    where (x.id = t.id or (t.installment_group_id is not null and x.installment_group_id = t.installment_group_id))
      and x.wallet_id = t.wallet_id and x.prepaid_by is null
      and (x.invoice_ref is null or not private.invoice_is_paid(x.wallet_id, x.invoice_ref))
    order by x.installment_n nulls first
  loop
    v_left := r.amount;
    for v_part in select * from jsonb_array_elements(p_parts) loop
      v_user := (v_part->>'user_id')::uuid;
      continue when v_user = v_keeper or (v_part->>'amount')::bigint = 0;
      v_share := r.amount * (v_part->>'amount')::bigint / v_psum;
      continue when v_share <= 0;
      v_left := v_left - v_share;
      v_items := coalesce((select jsonb_agg(i) from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) i
                           where i->>'owner' in (v_user::text, 'split')), '[]'::jsonb);
      -- parcelada: cada pessoa ganha a própria compra parcelada (mesmo número de parcelas)
      v_group := null;
      if r.installment_group_id is not null then
        v_group := (v_groups->>v_user::text)::uuid;
        if v_group is null then
          insert into public.installment_groups (wallet_id, description, total_amount, installments_total, first_date)
          select g.wallet_id, g.description, v_total * (v_part->>'amount')::bigint / v_psum, g.installments_total, g.first_date
            from public.installment_groups g where g.id = r.installment_group_id
          returning id into v_group;
          v_groups := v_groups || jsonb_build_object(v_user::text, v_group);
        end if;
      end if;
      insert into public.transactions (type, amount, date, wallet_id, category_id, place, description,
        created_by, assigned_to, installment_group_id, installment_n, installments_total, source, source_data)
      values ('expense', v_share, r.date, r.wallet_id, case when v_user = v_uid then r.category_id end, r.place, r.description,
        v_uid, v_user, v_group, r.installment_n, r.installments_total, r.source,
        jsonb_build_object('split_of', r.id, 'split_total', r.amount, 'items', v_items));
      if r.id = t.id and v_user <> v_uid then
        insert into public.notification_queue (user_id, kind, title, body, url)
        values (v_user, 'family_events', 'Parte de uma compra para você',
                private.brl(v_total * (v_part->>'amount')::bigint / v_psum) || coalesce(' em ' || t.place, '') || ' no ' || v_card,
                '/cards/' || t.wallet_id);
      end if;
      n := n + 1;
    end loop;

    v_items := case when p_items is null then null
      else coalesce((select jsonb_agg(i) from jsonb_array_elements(p_items) i
                     where i->>'owner' is null or i->>'owner' in (v_keeper::text, 'split')), '[]'::jsonb) end;
    update public.transactions set amount = v_left, assigned_to = v_keeper,
      category_id = case when v_keeper = v_uid or v_keeper = r.assigned_to then r.category_id end,
      source_data = coalesce(source_data, '{}'::jsonb) || jsonb_build_object('split_total', r.amount)
                    || case when v_items is null then '{}'::jsonb else jsonb_build_object('items', v_items) end
    where id = r.id;
    n := n + 1;
  end loop;

  if t.installment_group_id is not null then
    update public.installment_groups set total_amount = v_total - coalesce((
      select sum(g.total_amount) from public.installment_groups g
      where g.id in (select (value)::uuid from jsonb_each_text(v_groups))), 0)
    where id = t.installment_group_id;
  end if;
  return n;
end $$;

revoke execute on function public.split_purchase(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.split_purchase(uuid, jsonb, jsonb) to authenticated;
