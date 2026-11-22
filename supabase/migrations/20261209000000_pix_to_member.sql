-- Pix para alguém da família: gasto no Pix com destinatário do app (source_data.sender.user_id) gera para a
-- pessoa uma receita pendente (status 'pending', sem carteira, source 'pix', source_data.pix_of = id do gasto,
-- sender = quem enviou) e um aviso. Ela confirma pelo "para confirmar" e vira receita. Enquanto pendente,
-- acompanha o gasto: valor e data mudam junto; destinatário trocado ou gasto excluído apagam a pendente.

create or replace function private.pix_to_member() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_to uuid;
  v_name text;
  v_new boolean;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    -- a pendente antiga sai quando o gasto some ou deixa de ir para a mesma pessoa
    delete from public.transactions p
     where p.status = 'pending' and p.type = 'income' and p.source = 'pix'
       and (p.source_data->>'pix_of')::uuid = old.id
       and (tg_op = 'DELETE'
            or p.assigned_to is distinct from nullif(new.source_data->'sender'->>'user_id', '')::uuid
            or new.type <> 'expense' or new.status <> 'confirmed'
            or coalesce((select w.type from public.wallets w where w.id = new.wallet_id), '') <> 'pix');
    if tg_op = 'DELETE' then return old; end if;
  end if;

  v_to := nullif(new.source_data->'sender'->>'user_id', '')::uuid;
  if v_to is null or v_to = new.assigned_to or new.type <> 'expense' or new.status <> 'confirmed'
     or coalesce((select w.type from public.wallets w where w.id = new.wallet_id), '') <> 'pix'
     or not private.same_family(v_to, new.assigned_to) then
    return new;
  end if;

  -- já existe (edição do gasto): só acompanha valor e data
  update public.transactions p set amount = new.amount, date = new.date
   where p.status = 'pending' and p.type = 'income' and p.source = 'pix'
     and (p.source_data->>'pix_of')::uuid = new.id and p.assigned_to = v_to;
  if found then return new; end if;
  -- já foi confirmada antes: não cria de novo
  if exists (select 1 from public.transactions p where p.type = 'income' and (p.source_data->>'pix_of')::uuid = new.id) then
    return new;
  end if;

  select name into v_name from public.profiles where id = new.assigned_to;
  insert into public.transactions (type, amount, date, wallet_id, description, created_by, assigned_to, source, status, source_data)
  values ('income', new.amount, new.date, null, coalesce(new.place, 'Pix recebido'), new.assigned_to, v_to, 'pix', 'pending',
          jsonb_build_object('pix_of', new.id, 'sender', jsonb_build_object('user_id', new.assigned_to, 'name', coalesce(v_name, 'Alguém'))));
  insert into public.notification_queue (user_id, kind, title, body, url)
  values (v_to, 'family_events', 'Pix para confirmar',
          coalesce(v_name, 'Alguém') || ' te enviou ' || private.brl(new.amount) || '. Confirme para entrar nas receitas.',
          '/home?pendentes=1');
  return new;
end $$;

drop trigger if exists transactions_pix_to_member on public.transactions;
create trigger transactions_pix_to_member
  after insert or update of amount, date, source_data, wallet_id, status, type or delete on public.transactions
  for each row execute function private.pix_to_member();
