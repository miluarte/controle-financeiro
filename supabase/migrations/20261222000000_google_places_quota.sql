-- Limite da busca do Google no cadastro de locais (2026-11-27, pedido da Milena): 100 chamadas por dia
-- no total (busca e detalhe), contadas no banco antes de chamar o Google. O dia segue o horário de Fortaleza.
create table private.google_places_usage (
  day   date primary key,
  count integer not null default 0
);

create function public.use_google_places_quota() returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_day date := (now() at time zone 'America/Fortaleza')::date;
  v_count integer;
begin
  if (select auth.uid()) is null then return false; end if;
  insert into private.google_places_usage as u (day, count) values (v_day, 1)
  on conflict (day) do update set count = u.count + 1
  returning count into v_count;
  return v_count <= 100;
end $$;
revoke execute on function public.use_google_places_quota() from public, anon;
grant execute on function public.use_google_places_quota() to authenticated;
