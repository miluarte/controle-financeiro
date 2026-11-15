-- Notificações push (5.13) e eventos da família (5.7.9).
-- Segredos (chave VAPID privada, segredo do agendador) ficam em private.app_secrets, fora da API,
-- e são inseridos à parte (não versionados).

create extension if not exists pg_net;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.app_secrets (
  name  text primary key,
  value text not null
);

-- Fila de avisos gerados por eventos (compra no cartão, atribuição, teste).
create table public.notification_queue (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null,
  title      text not null,
  body       text not null,
  url        text,
  sent_at    timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notification_queue_pending_idx on public.notification_queue (created_at) where sent_at is null;
create index notification_queue_user_idx on public.notification_queue (user_id);

-- Registro do que já foi enviado, para não repetir aviso agendado.
create table public.notification_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null,
  key        text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, kind, key)
);

alter table public.notification_queue enable row level security;
alter table public.notification_log enable row level security;
-- sem políticas: só a função de servidor (service role) lê e escreve

create trigger notification_queue_set_updated_at before update on public.notification_queue
  for each row execute function public.set_updated_at();
create trigger notification_log_set_updated_at before update on public.notification_log
  for each row execute function public.set_updated_at();

-- R$ 1.234,56
create function public.brl(p_cents bigint) returns text
language sql immutable set search_path = '' as $$
  select 'R$ ' || translate(to_char(p_cents / 100.0, 'FM999,999,990.00'), ',.', '.,')
$$;

-- Configuração para a Edge Function (só service role).
create function public.get_push_config() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_object_agg(name, value), '{}'::jsonb) from private.app_secrets
$$;
revoke execute on function public.get_push_config() from public, anon, authenticated;
grant execute on function public.get_push_config() to service_role;

-- 5.7.9: titular é avisado quando um membro registra compra no cartão dele.
create function public.notify_card_purchase() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  w public.wallets;
  v_name text;
begin
  if new.type <> 'expense' or new.status <> 'confirmed' or new.wallet_id is null then return new; end if;
  if new.installment_n is not null and new.installment_n > 1 then return new; end if;
  select * into w from public.wallets where id = new.wallet_id;
  if w.id is null or new.created_by is null or w.owner_id = new.created_by then return new; end if;
  select name into v_name from public.profiles where id = new.created_by;
  insert into public.notification_queue (user_id, kind, title, body, url)
  values (w.owner_id, 'family_events', 'Compra no seu cartão',
          coalesce(v_name, 'Um membro') || ' registrou ' || public.brl(
            case when new.installments_total is not null
                 then (select total_amount from public.installment_groups where id = new.installment_group_id)
                 else new.amount end)
          || coalesce(' em ' || new.place, '') || ' no ' || w.name,
          '/cards/' || w.id);
  return new;
end $$;

create trigger transactions_notify_card_purchase
  after insert on public.transactions
  for each row execute function public.notify_card_purchase();

-- 5.7.9: membro é avisado quando uma compra é atribuída a ele.
create function public.notify_assignment() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.assigned_to = old.assigned_to then return new; end if;
  if new.installment_n is not null and exists (
    select 1 from public.transactions x
    where x.installment_group_id = new.installment_group_id and x.assigned_to = new.assigned_to
      and x.installment_n < new.installment_n and x.id <> new.id
  ) then return new; end if; -- um aviso por compra parcelada
  if new.assigned_to = public.wallet_owner(new.wallet_id) then return new; end if;
  insert into public.notification_queue (user_id, kind, title, body, url)
  values (new.assigned_to, 'family_events', 'Compra atribuída a você',
          public.brl(new.amount) || coalesce(' em ' || new.place, '')
          || case when new.installments_total is not null then ' (' || new.installments_total || ' parcelas)' else '' end,
          '/cards/' || new.wallet_id);
  return new;
end $$;

create trigger transactions_notify_assignment
  after update of assigned_to on public.transactions
  for each row execute function public.notify_assignment();

-- Botão "Enviar teste" em Config > Notificações.
create function public.send_test_notification() returns void
language sql security definer set search_path = '' as $$
  insert into public.notification_queue (user_id, kind, title, body, url)
  values ((select auth.uid()), 'test', 'Troco', 'As notificações estão funcionando.', '/home')
$$;

revoke execute on function public.notify_card_purchase() from public, anon, authenticated;
revoke execute on function public.notify_assignment() from public, anon, authenticated;
revoke execute on function public.brl(bigint) from public, anon;
revoke execute on function public.send_test_notification() from public, anon;
grant execute on function public.send_test_notification() to authenticated;

-- A cada 10 minutos chama a Edge Function "notify" (envia a fila e os avisos agendados).
select cron.schedule(
  'troco-notify',
  '*/10 * * * *',
  $$select net.http_post(
      url := 'https://ievipjugroamsrxolvip.supabase.co/functions/v1/notify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (select value from private.app_secrets where name = 'cron_secret')),
      body := '{}'::jsonb
    );$$
);
