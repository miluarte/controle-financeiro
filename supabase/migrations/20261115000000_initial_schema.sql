-- Troco: schema inicial no Supabase (substitui Apps Script + Google Sheets).
-- Valores monetários em centavos (bigint). Toda tabela tem user_id e RLS:
-- cada usuário só enxerga e altera as próprias linhas.

-- ---------- tabelas ----------

create table public.accounts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name            text not null,
  type            text not null check (type in ('checking', 'savings', 'credit_card', 'cash', 'loan')),
  initial_balance bigint not null default 0,
  credit_limit    bigint,
  closing_day     smallint check (closing_day between 1 and 31),
  due_day         smallint check (due_day between 1 and 31),
  institution     text,
  color           text not null default 'gray',
  icon            text not null default 'wallet',
  archived        boolean not null default false,
  created_at      timestamptz not null default now()
);

create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text not null,
  type       text not null check (type in ('income', 'expense')),
  icon       text not null default 'ellipsis',
  color      text not null default 'gray',
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.installment_groups (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid() references auth.users(id) on delete cascade,
  description        text not null,
  total_amount       bigint not null,
  installment_count  integer not null check (installment_count > 0),
  installment_amount bigint not null,
  account_id         uuid not null references public.accounts(id),
  category_id        uuid references public.categories(id) on delete set null,
  start_date         date not null,
  status             text not null default 'active' check (status in ('active', 'paid_off', 'cancelled')),
  paid_count         integer not null default 0,
  created_at         timestamptz not null default now()
);

create table public.recurring_groups (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type        text not null check (type in ('income', 'expense')),
  description text not null,
  amount      bigint not null,
  account_id  uuid not null references public.accounts(id),
  category_id uuid references public.categories(id) on delete set null,
  frequency   text not null check (frequency in ('daily', 'weekly', 'biweekly', 'monthly', 'yearly')),
  start_date  date not null,
  end_date    date,
  active      boolean not null default true,
  notes       text,
  created_at  timestamptz not null default now()
);

create table public.transactions (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type                 text not null check (type in ('income', 'expense', 'transfer')),
  amount               bigint not null check (amount >= 0),
  description          text not null default '',
  date                 date not null,
  account_id           uuid not null references public.accounts(id),
  to_account_id        uuid references public.accounts(id),
  category_id          uuid references public.categories(id) on delete set null,
  installment_group_id uuid references public.installment_groups(id) on delete cascade,
  installment_number   integer,
  installment_total    integer,
  recurring_group_id   uuid references public.recurring_groups(id) on delete set null,
  purchase_date        date,
  merchant             text,
  payment_method       text check (payment_method in ('pix', 'debit', 'boleto', 'ted')),
  paid                 boolean not null default false,
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint transfer_has_destination check (type <> 'transfer' or to_account_id is not null)
);

create table public.budget_goals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category_id   uuid not null references public.categories(id) on delete cascade,
  monthly_limit bigint not null,
  month         text check (month ~ '^\d{4}-\d{2}$'),
  is_recurring  boolean not null default false,
  created_at    timestamptz not null default now()
);

-- ---------- índices ----------

create index accounts_user_idx on public.accounts (user_id);
create index categories_user_idx on public.categories (user_id);
create index installment_groups_user_idx on public.installment_groups (user_id);
create index installment_groups_account_idx on public.installment_groups (account_id);
create index installment_groups_category_idx on public.installment_groups (category_id);
create index recurring_groups_user_idx on public.recurring_groups (user_id);
create index recurring_groups_account_idx on public.recurring_groups (account_id);
create index recurring_groups_category_idx on public.recurring_groups (category_id);
create index transactions_user_date_idx on public.transactions (user_id, date);
create index transactions_account_idx on public.transactions (account_id);
create index transactions_to_account_idx on public.transactions (to_account_id);
create index transactions_category_idx on public.transactions (category_id);
create index transactions_installment_group_idx on public.transactions (installment_group_id);
create index transactions_recurring_group_idx on public.transactions (recurring_group_id);
create index budget_goals_user_idx on public.budget_goals (user_id);
create index budget_goals_category_idx on public.budget_goals (category_id);

-- ---------- updated_at ----------

create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

-- ---------- RLS ----------

do $$
declare t text;
begin
  foreach t in array array['accounts', 'categories', 'installment_groups', 'recurring_groups', 'transactions', 'budget_goals']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- ---------- saldo calculado ----------
-- Saldo não é mais guardado: é calculado a partir das transações.
-- Conta comum: só conta o que já aconteceu (data <= hoje).
-- Cartão de crédito: conta também lançamentos futuros (parcelas e recorrências
-- já comprometem o limite), exceto os futuros de grupo quitado/cancelado/desativado.

create function public.today_br() returns date
language sql stable set search_path = '' as $$
  select (now() at time zone 'America/Sao_Paulo')::date
$$;

create view public.accounts_with_balance
with (security_invoker = true) as
select
  a.*,
  a.initial_balance + coalesce(m.delta, 0) as current_balance,
  case when a.type = 'credit_card' and a.credit_limit is not null and a.credit_limit > 0
       then a.credit_limit + a.initial_balance + coalesce(m.delta, 0)
  end as available_credit
from public.accounts a
left join lateral (
  select sum(
    case
      when t.to_account_id = a.id and t.type = 'transfer' then t.amount
      when t.type = 'income' then t.amount
      else -t.amount
    end
  ) as delta
  from public.transactions t
  left join public.installment_groups ig on ig.id = t.installment_group_id
  left join public.recurring_groups rg on rg.id = t.recurring_group_id
  where (t.account_id = a.id or (t.type = 'transfer' and t.to_account_id = a.id))
    and (
      t.date <= public.today_br()
      or (
        a.type = 'credit_card'
        and coalesce(ig.status, 'active') = 'active'
        and coalesce(rg.active, true)
      )
    )
) m on true;

-- ---------- parcelamento ----------
-- Cria o grupo e todas as parcelas numa transação só.

create function public.create_installment_group(
  p_description text,
  p_total_amount bigint,
  p_installment_count integer,
  p_installment_amount bigint,
  p_account_id uuid,
  p_category_id uuid,
  p_start_date date
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_group_id uuid;
  n integer;
begin
  insert into public.installment_groups
    (description, total_amount, installment_count, installment_amount, account_id, category_id, start_date)
  values
    (p_description, p_total_amount, p_installment_count, p_installment_amount, p_account_id, p_category_id, p_start_date)
  returning id into v_group_id;

  for n in 1..p_installment_count loop
    insert into public.transactions
      (type, amount, description, date, account_id, category_id,
       installment_group_id, installment_number, installment_total)
    values
      ('expense', p_installment_amount,
       p_description || ' (' || n || '/' || p_installment_count || ')',
       (p_start_date + make_interval(months => n - 1))::date,
       p_account_id, p_category_id, v_group_id, n, p_installment_count);
  end loop;

  return v_group_id;
end $$;

-- Atualiza o grupo e regera as parcelas que ainda não aconteceram (data > hoje),
-- mantendo as já realizadas.
create function public.update_installment_group(
  p_id uuid,
  p_description text,
  p_total_amount bigint,
  p_installment_count integer,
  p_installment_amount bigint,
  p_account_id uuid,
  p_category_id uuid,
  p_start_date date
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  g public.installment_groups;
  n integer;
  d date;
begin
  update public.installment_groups set
    description        = coalesce(p_description, description),
    total_amount       = coalesce(p_total_amount, total_amount),
    installment_count  = coalesce(p_installment_count, installment_count),
    installment_amount = coalesce(p_installment_amount, installment_amount),
    account_id         = coalesce(p_account_id, account_id),
    category_id        = coalesce(p_category_id, category_id),
    start_date         = coalesce(p_start_date, start_date)
  where id = p_id
  returning * into g;

  if g.id is null then
    raise exception 'Parcelamento não encontrado';
  end if;

  delete from public.transactions where installment_group_id = g.id;

  for n in 1..g.installment_count loop
    d := (g.start_date + make_interval(months => n - 1))::date;
    insert into public.transactions
      (type, amount, description, date, account_id, category_id,
       installment_group_id, installment_number, installment_total)
    values
      ('expense', g.installment_amount,
       g.description || ' (' || n || '/' || g.installment_count || ')',
       d, g.account_id, g.category_id, g.id, n, g.installment_count);
  end loop;

  return g.id;
end $$;

-- ---------- recorrência ----------
-- Gera as ocorrências do início até end_date (ou 12 meses à frente de hoje).

create function public.create_recurring_group(
  p_type text,
  p_description text,
  p_amount bigint,
  p_account_id uuid,
  p_category_id uuid,
  p_frequency text,
  p_start_date date,
  p_end_date date,
  p_notes text
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_group_id uuid;
  v_limit date := coalesce(p_end_date, (public.today_br() + interval '12 months')::date);
  v_step interval;
  d date := p_start_date;
  i integer := 0;
begin
  v_step := case p_frequency
    when 'daily' then interval '1 day'
    when 'weekly' then interval '7 days'
    when 'biweekly' then interval '14 days'
    when 'monthly' then interval '1 month'
    when 'yearly' then interval '1 year'
  end;

  insert into public.recurring_groups
    (type, description, amount, account_id, category_id, frequency, start_date, end_date, notes)
  values
    (p_type, p_description, p_amount, p_account_id, p_category_id, p_frequency, p_start_date, p_end_date, p_notes)
  returning id into v_group_id;

  while d <= v_limit and i < 400 loop
    insert into public.transactions
      (type, amount, description, date, account_id, category_id, recurring_group_id, notes)
    values
      (p_type, p_amount, p_description, d, p_account_id, p_category_id, v_group_id, p_notes);
    i := i + 1;
    d := (p_start_date + v_step * i)::date;
  end loop;

  return v_group_id;
end $$;

grant execute on function public.create_installment_group(text, bigint, integer, bigint, uuid, uuid, date) to authenticated;
grant execute on function public.update_installment_group(uuid, text, bigint, integer, bigint, uuid, uuid, date) to authenticated;
grant execute on function public.create_recurring_group(text, text, bigint, uuid, uuid, text, date, date, text) to authenticated;
revoke execute on function public.create_installment_group(text, bigint, integer, bigint, uuid, uuid, date) from anon, public;
revoke execute on function public.update_installment_group(uuid, text, bigint, integer, bigint, uuid, uuid, date) from anon, public;
revoke execute on function public.create_recurring_group(text, text, bigint, uuid, uuid, text, date, date, text) from anon, public;

-- ---------- novo usuário ----------
-- Cada conta nova já nasce com as categorias padrão (mesma lista de
-- DEFAULT_CATEGORIES em lib/constants.ts).

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.categories (user_id, name, type, icon, color, is_default) values
    (new.id, 'Alimentação',   'expense', 'utensils',    'orange', true),
    (new.id, 'Transporte',    'expense', 'car',         'blue',   true),
    (new.id, 'Moradia',       'expense', 'home',        'green',  true),
    (new.id, 'Saúde',         'expense', 'heart-pulse', 'red',    true),
    (new.id, 'Educação',      'expense', 'book',        'purple', true),
    (new.id, 'Lazer',         'expense', 'gamepad-2',   'pink',   true),
    (new.id, 'Vestuário',     'expense', 'shirt',       'yellow', true),
    (new.id, 'Outros',        'expense', 'ellipsis',    'gray',   true),
    (new.id, 'Salário',       'income',  'briefcase',   'green',  true),
    (new.id, 'Freelance',     'income',  'laptop',      'blue',   true),
    (new.id, 'Investimentos', 'income',  'trending-up', 'purple', true),
    (new.id, 'Outros',        'income',  'plus-circle', 'gray',   true);
  return new;
end $$;

revoke execute on function public.handle_new_user() from anon, authenticated, public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
