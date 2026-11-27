-- Locais: link do Google Maps. O app lê o link (Edge Function ler-mapa) e guarda o endereço e o ponto
-- (latitude e longitude) para o mapa dos locais mais visitados.
alter table public.places add column if not exists maps_url text
  check (maps_url is null or (char_length(maps_url) <= 500 and maps_url ~ '^https://'));
alter table public.places add constraint places_point check (
  (latitude is null and longitude is null)
  or (latitude between -90 and 90 and longitude between -180 and 180));

drop function public.save_place(uuid, text, text, jsonb);

-- Salva o local com os nomes. Nome que estava em outro local passa para este. Sem p_id, cria.
create function public.save_place(
  p_id uuid, p_nickname text, p_address text, p_names jsonb,
  p_maps_url text default null, p_latitude double precision default null, p_longitude double precision default null)
returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_scope uuid := private.place_scope();
  v_id uuid := p_id;
begin
  if v_scope is null then raise exception 'Entre na sua conta.'; end if;
  if jsonb_typeof(p_names) <> 'array' or jsonb_array_length(p_names) = 0 then
    raise exception 'Informe ao menos um nome da maquininha.';
  end if;

  if v_id is null then
    insert into public.places (scope_id, nickname, address, maps_url, latitude, longitude)
    values (v_scope, nullif(btrim(p_nickname), ''), nullif(btrim(p_address), ''), nullif(btrim(p_maps_url), ''), p_latitude, p_longitude)
    returning id into v_id;
  else
    update public.places set nickname = nullif(btrim(p_nickname), ''), address = nullif(btrim(p_address), ''),
      maps_url = nullif(btrim(p_maps_url), ''), latitude = p_latitude, longitude = p_longitude
    where id = v_id;
    if not found then raise exception 'Local não encontrado.'; end if;
  end if;

  delete from public.place_names
  where scope_id = v_scope
    and (place_id = v_id or key in (select n->>'key' from jsonb_array_elements(p_names) n));

  insert into public.place_names (place_id, scope_id, key, name)
  select distinct on (n->>'key') v_id, v_scope, n->>'key', btrim(n->>'name')
  from jsonb_array_elements(p_names) n
  where coalesce(n->>'key', '') <> '' and coalesce(btrim(n->>'name'), '') <> '';

  -- local que ficou sem nenhum nome deixa de existir
  delete from public.places p
  where p.scope_id = v_scope and p.id <> v_id
    and not exists (select 1 from public.place_names pn where pn.place_id = p.id);

  return v_id;
end $$;
revoke execute on function public.save_place(uuid, text, text, jsonb, text, double precision, double precision) from public, anon;
grant execute on function public.save_place(uuid, text, text, jsonb, text, double precision, double precision) to authenticated;
