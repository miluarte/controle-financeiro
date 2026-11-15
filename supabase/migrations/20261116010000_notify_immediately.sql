-- Envio imediato: cada aviso que entra na fila chama a Edge Function na hora (pg_net é assíncrono,
-- não atrasa a transação). O agendamento de 10 minutos continua para os avisos por horário.
create function public.dispatch_notifications() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform net.http_post(
    url := 'https://ievipjugroamsrxolvip.supabase.co/functions/v1/notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select value from private.app_secrets where name = 'cron_secret')),
    body := '{"queue_only": true}'::jsonb
  );
  return null;
end $$;
revoke execute on function public.dispatch_notifications() from public, anon, authenticated;

create trigger notification_queue_dispatch
  after insert on public.notification_queue
  for each statement execute function public.dispatch_notifications();
