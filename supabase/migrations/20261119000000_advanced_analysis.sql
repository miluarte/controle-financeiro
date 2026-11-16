-- Camada analítica (backlog da spec): objetivos com simulação, custo por uso de assinatura e
-- custo de deslocamento por veículo. Fica fora do fluxo de caixa: nada aqui gera lançamento.
-- Decisões em aberto resolvidas assim:
--  * objetivos simultâneos: a poupança média vai para o de maior prioridade (menor número) até
--    completar, depois para o seguinte;
--  * prejuízo da assinatura: comparado com o preço avulso por uso, quando informado.

create table public.goals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name          text not null check (length(trim(name)) > 0),
  target_amount bigint not null check (target_amount > 0),
  saved_amount  bigint not null default 0 check (saved_amount >= 0),
  target_date   date,
  priority      integer not null default 0,
  done_at       timestamptz,
  created_at    timestamptz not null default now()
);

create table public.subscriptions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name           text not null check (length(trim(name)) > 0),
  monthly_amount bigint not null check (monthly_amount > 0),
  unit_price     bigint check (unit_price > 0),
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

create table public.subscription_uses (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  used_on         date not null,
  unique (subscription_id, used_on)
);

create table public.vehicles (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name         text not null check (length(trim(name)) > 0),
  km_per_liter numeric(6,2) not null check (km_per_liter > 0),
  fuel_price   bigint not null check (fuel_price > 0),   -- centavos por litro
  created_at   timestamptz not null default now()
);

create table public.vehicle_trips (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  date       date not null,
  km         numeric(8,1) not null check (km > 0),
  note       text
);

create table public.vehicle_maintenance (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  vehicle_id   uuid not null references public.vehicles(id) on delete cascade,
  name         text not null check (length(trim(name)) > 0),
  cost         bigint not null check (cost > 0),
  every_months integer not null check (every_months between 1 and 120)
);

create index on public.goals (user_id);
create index on public.subscriptions (user_id);
create index on public.subscription_uses (subscription_id, used_on);
create index on public.subscription_uses (user_id);
create index on public.vehicles (user_id);
create index on public.vehicle_trips (vehicle_id, date);
create index on public.vehicle_trips (user_id);
create index on public.vehicle_maintenance (vehicle_id);
create index on public.vehicle_maintenance (user_id);

do $$
declare t text;
begin
  foreach t in array array['goals','subscriptions','subscription_uses','vehicles','vehicle_trips','vehicle_maintenance'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own rows" on public.%I for all to authenticated
                    using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- uso e viagens só em itens da própria pessoa
create function private.check_owner_parent() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'subscription_uses' then
    if not exists (select 1 from public.subscriptions where id = new.subscription_id and user_id = new.user_id) then
      raise exception 'Assinatura não encontrada.';
    end if;
  elsif not exists (select 1 from public.vehicles where id = new.vehicle_id and user_id = new.user_id) then
    raise exception 'Veículo não encontrado.';
  end if;
  return new;
end $$;

create trigger subscription_uses_owner before insert or update on public.subscription_uses
  for each row execute function private.check_owner_parent();
create trigger vehicle_trips_owner before insert or update on public.vehicle_trips
  for each row execute function private.check_owner_parent();
create trigger vehicle_maintenance_owner before insert or update on public.vehicle_maintenance
  for each row execute function private.check_owner_parent();

revoke execute on function private.check_owner_parent() from public, anon;
