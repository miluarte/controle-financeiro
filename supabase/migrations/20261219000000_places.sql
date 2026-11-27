-- Locais (2026-11-27, pedido da Milena): cadastro compartilhado com a família. Cada local junta os nomes
-- que aparecem na maquininha e guarda um apelido e um endereço, ambos opcionais. O app continua mostrando
-- o nome da maquininha; o apelido só ajuda a reconhecer a loja. Latitude e longitude ficam para o mapa.
-- A categoria não entra aqui: ela vem do histórico de cada pessoa.

-- escopo do cadastro: a família ativa da pessoa ou, sem família, a própria pessoa
create function private.place_scope() returns uuid
language sql stable security definer set search_path = '' as $$
  select coalesce(private.my_family_id(), (select auth.uid()))
$$;
revoke execute on function private.place_scope() from public, anon;
grant execute on function private.place_scope() to authenticated;

create table public.places (
  id         uuid primary key default gen_random_uuid(),
  scope_id   uuid not null default private.place_scope(),
  nickname   text check (nickname is null or char_length(nickname) between 1 and 80),
  address    text check (address is null or char_length(address) between 1 and 200),
  latitude   double precision,
  longitude  double precision,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index places_scope on public.places(scope_id);

-- nomes da maquininha ligados ao local; key = nome normalizado (normPlace no app: sem maiúsculas,
-- acentos, prefixo de intermediador e parcela). Um nome pertence a um local só dentro do escopo.
create table public.place_names (
  id         uuid primary key default gen_random_uuid(),
  place_id   uuid not null references public.places(id) on delete cascade,
  scope_id   uuid not null,
  key        text not null check (char_length(key) between 1 and 200),
  name       text not null check (char_length(name) between 1 and 200),
  created_at timestamptz not null default now(),
  unique (scope_id, key)
);
create index place_names_place on public.place_names(place_id);

create trigger places_set_updated_at before update on public.places
  for each row execute function private.set_updated_at();

alter table public.places enable row level security;
alter table public.place_names enable row level security;

create policy "places scope" on public.places for all to authenticated
  using (scope_id = private.place_scope()) with check (scope_id = private.place_scope());
create policy "place names scope" on public.place_names for all to authenticated
  using (scope_id = private.place_scope()) with check (scope_id = private.place_scope());

-- Salva o local com os nomes. Nome que estava em outro local passa para este. Sem p_id, cria.
create function public.save_place(p_id uuid, p_nickname text, p_address text, p_names jsonb)
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
    insert into public.places (scope_id, nickname, address)
    values (v_scope, nullif(btrim(p_nickname), ''), nullif(btrim(p_address), ''))
    returning id into v_id;
  else
    update public.places set nickname = nullif(btrim(p_nickname), ''), address = nullif(btrim(p_address), '')
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
revoke execute on function public.save_place(uuid, text, text, jsonb) from public, anon;
grant execute on function public.save_place(uuid, text, text, jsonb) to authenticated;
