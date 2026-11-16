-- Automações do iPhone (spec v2): Apple Pay (automação "Transação" do Atalhos), toque duplo
-- (atalho que pergunta valor e local) e SMS do banco (automação "Mensagem").
-- O Atalhos chama a Edge Function `atalho` com um token pessoal; a compra entra como
-- pendente (status = 'pending') e a pessoa confirma no app (fila de pendentes).

-- automation_tokens e wallet_aliases já existem no modelo da spec (20261115120000).

-- Gera um token novo (troca o anterior). O texto do token só aparece aqui; o banco guarda o hash.
create function public.create_automation_token() returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_token text := encode(extensions.gen_random_bytes(24), 'hex');
begin
  if v_uid is null then raise exception 'Não autenticado'; end if;
  update public.automation_tokens set revoked_at = now() where user_id = v_uid and revoked_at is null;
  insert into public.automation_tokens (user_id, name, token_hash)
  values (v_uid, 'iPhone', encode(extensions.digest(v_token, 'sha256'), 'hex'));
  return v_token;
end $$;
revoke execute on function public.create_automation_token() from public, anon;
grant execute on function public.create_automation_token() to authenticated;

-- Chamada só pela Edge Function `atalho` (execute só para service_role; fica no public porque a API só publica esse schema). Cria o gasto pendente e avisa a pessoa.
create function public.automation_capture(
  p_token text, p_source text, p_amount bigint, p_place text, p_card text, p_text text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid;
  v_wallet uuid;
  v_id uuid;
  v_source text := case when p_source in ('apple_pay', 'back_tap', 'notification') then p_source else 'back_tap' end;
  v_place text := nullif(trim(p_place), '');
  v_card text := lower(nullif(trim(p_card), ''));
begin
  select user_id into v_user from public.automation_tokens
  where token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex') and revoked_at is null;
  if v_user is null then raise exception 'token'; end if;
  update public.automation_tokens set last_used_at = now() where user_id = v_user and revoked_at is null;

  if p_amount is null or p_amount <= 0 then raise exception 'valor'; end if;

  -- mesma compra vinda de duas automações (Apple Pay e SMS) em poucos minutos: fica uma só
  select id into v_id from public.transactions
  where assigned_to = v_user and status = 'pending' and amount = p_amount
    and created_at > now() - interval '5 minutes'
  limit 1;
  if v_id is not null then
    return jsonb_build_object('id', v_id, 'amount', p_amount, 'place', v_place, 'duplicate', true);
  end if;

  -- cartão informado pelo Apple Pay: primeiro o apelido aprendido, depois um nome parecido
  if v_card is not null then
    select a.wallet_id into v_wallet from public.wallet_aliases a
    where a.user_id = v_user and a.source = 'apple_pay' and lower(a.alias) = v_card and a.wallet_id is not null;
  end if;
  if v_wallet is null and v_card is not null then
    select w.id into v_wallet from public.wallets w
    where w.active and private.has_wallet_access(w.id, v_user)
      and (v_card like '%' || lower(w.name) || '%' or lower(w.name) like '%' || v_card || '%')
    order by (w.owner_id = v_user) desc, length(w.name) desc
    limit 1;
  end if;

  insert into public.transactions (type, amount, date, wallet_id, place, created_by, assigned_to, source, status, source_data)
  values ('expense', p_amount, private.today_br(), v_wallet, v_place, v_user, v_user, v_source, 'pending',
          jsonb_strip_nulls(jsonb_build_object('card', nullif(trim(p_card), ''), 'text', nullif(trim(p_text), ''))))
  returning id into v_id;

  insert into public.notification_queue (user_id, kind, title, body, url)
  values (v_user, 'automations', 'Gasto para confirmar',
          private.brl(p_amount) || coalesce(' · ' || v_place, ''), '/home?pendentes=1');

  return jsonb_build_object('id', v_id, 'amount', p_amount, 'place', v_place, 'duplicate', false);
end $$;
revoke execute on function public.automation_capture(text, text, bigint, text, text, text) from public, anon, authenticated;
grant execute on function public.automation_capture(text, text, bigint, text, text, text) to service_role;
