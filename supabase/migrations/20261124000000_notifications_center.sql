-- Central de notificações: histórico do que foi avisado (eventos da família, automações,
-- contas a vencer, resumos). A fila (notification_queue) continua só para o envio do push.
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null,
  title      text not null,
  body       text not null,
  url        text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;
create policy "own read" on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy "own update" on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own delete" on public.notifications for delete to authenticated using (user_id = (select auth.uid()));
grant select, update (read_at), delete on public.notifications to authenticated;

-- todo aviso que entra na fila também vai para a central (menos o teste)
create function private.copy_to_notifications() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.kind <> 'test' then
    insert into public.notifications (user_id, kind, title, body, url)
    values (new.user_id, new.kind, new.title, new.body, new.url);
  end if;
  return new;
end $$;
revoke execute on function private.copy_to_notifications() from public, anon, authenticated;

create trigger notification_queue_copy after insert on public.notification_queue
  for each row execute function private.copy_to_notifications();
