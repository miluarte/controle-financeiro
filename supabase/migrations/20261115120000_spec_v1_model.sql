-- Troco: modelo de dados da especificação funcional v1.0 (seção 6).
-- Substitui o modelo inicial (accounts/recurring_groups etc.), que nunca teve usuário.
--
-- Convenções:
--   * nomes de tabela e coluna em inglês snake_case (mapa para os nomes da spec em docs/banco-de-dados.md)
--   * valores monetários em centavos (bigint)
--   * datas de referência de mês (ref_month, invoice_ref) sempre no dia 1
--   * toda tabela tem id, created_at, updated_at e RLS ativa
--   * escrita que envolve outra pessoa (família, atribuição) passa por funções RPC com checagem própria

-- =====================================================================
-- 0. remove o modelo anterior
-- =====================================================================

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop view if exists public.accounts_with_balance;
drop function if exists public.create_installment_group(text, bigint, integer, bigint, uuid, uuid, date);
drop function if exists public.update_installment_group(uuid, text, bigint, integer, bigint, uuid, uuid, date);
drop function if exists public.create_recurring_group(text, text, bigint, uuid, uuid, text, date, date, text);
drop table if exists public.budget_goals, public.transactions, public.recurring_groups,
  public.installment_groups, public.categories, public.accounts cascade;

create extension if not exists pg_cron;

-- =====================================================================
-- 1. tabelas
-- =====================================================================

create table public.profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  name                 text not null default '',
  avatar_color         text not null default 'gray',
  currency             text not null default 'BRL',
  theme                text not null default 'system' check (theme in ('light', 'dark', 'system')),
  carry_over_balance   boolean not null default false,
  monthly_income       bigint check (monthly_income >= 0),
  default_wallet_id    uuid,
  onboarding_dismissed boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create table public.families (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  code           text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{8}$'),
  entries_paused boolean not null default false,
  created_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- user_id único: cada pessoa participa de uma família por vez (FAM-6).
create table public.family_members (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references public.families(id) on delete cascade,
  user_id    uuid not null unique references auth.users(id) on delete cascade,
  role       text not null default 'member' check (role in ('admin', 'member')),
  status     text not null default 'pending' check (status in ('pending', 'active')),
  joined_at  timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wallets (
  id                    uuid primary key default gen_random_uuid(),
  owner_id              uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name                  text not null,
  type                  text not null check (type in ('pix', 'debit', 'credit', 'cash', 'other')),
  finish                text not null default 'black',
  currency              text not null default 'BRL',
  closing_day           smallint check (closing_day between 1 and 31),
  due_day               smallint check (due_day between 1 and 31),
  -- compra no dia exato do fechamento entra na fatura que fecha (true) ou na seguinte (false). 7.5
  closing_day_inclusive boolean not null default true,
  spending_limit        bigint check (spending_limit > 0),
  -- none: privado | family: todos os membros ativos | selected: só quem está em wallet_shares
  share_scope           text not null default 'none' check (share_scope in ('none', 'family', 'selected')),
  sort_order            integer not null default 0,
  active                boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint credit_needs_days check (type <> 'credit' or (closing_day is not null and due_day is not null)),
  constraint only_credit_is_shared check (share_scope = 'none' or type = 'credit')
);

alter table public.profiles
  add constraint profiles_default_wallet_fk foreign key (default_wallet_id) references public.wallets(id) on delete set null;

create table public.wallet_shares (
  id         uuid primary key default gen_random_uuid(),
  wallet_id  uuid not null references public.wallets(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (wallet_id, user_id)
);

-- Cartões vistos pelo Apple Pay ou pela notificação do banco, vinculados a uma carteira (CAR-6).
create table public.wallet_aliases (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  source     text not null check (source in ('apple_pay', 'notification')),
  alias      text not null,
  wallet_id  uuid references public.wallets(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source, alias)
);

create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type       text not null check (type in ('expense', 'income')),
  name       text not null,
  icon       text not null default 'ellipsis',
  color      text not null default 'gray',
  class      text check (class in ('essential', 'desire')),
  sort_order integer not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, type, name),
  constraint class_only_for_expense check (class is null or type = 'expense')
);

create table public.installment_groups (
  id                 uuid primary key default gen_random_uuid(),
  created_by         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  wallet_id          uuid references public.wallets(id) on delete set null,
  description        text not null default '',
  total_amount       bigint not null check (total_amount > 0),
  installments_total integer not null check (installments_total > 0),
  first_date         date not null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table public.bills (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name                text not null,
  amount              bigint not null check (amount > 0),
  due_day             smallint not null check (due_day between 1 and 31),
  due_next_month      boolean not null default false,
  category_id         uuid references public.categories(id) on delete set null,
  recurring           boolean not null default false,
  start_month         date not null check (extract(day from start_month) = 1),
  installment_current integer,
  installments_total  integer,
  active              boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint installments_consistent check (
    (installments_total is null and installment_current is null)
    or (installments_total > 0 and installment_current between 1 and installments_total)
  )
);

create table public.bill_occurrences (
  id             uuid primary key default gen_random_uuid(),
  bill_id        uuid not null references public.bills(id) on delete cascade,
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ref_month      date not null check (extract(day from ref_month) = 1),
  installment_n  integer,
  amount         bigint not null check (amount > 0),
  due_date       date not null,
  paid_at        date,
  transaction_id uuid,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (bill_id, ref_month)
);

create table public.transactions (
  id                   uuid primary key default gen_random_uuid(),
  type                 text not null check (type in (
                         'expense', 'income', 'save_apply', 'save_redeem', 'invoice_payment', 'settlement_payment')),
  amount               bigint not null check (amount > 0),
  date                 date not null,
  category_id          uuid references public.categories(id) on delete set null,
  wallet_id            uuid references public.wallets(id) on delete set null,
  -- nome da carteira guardado quando ela some (ex.: titular excluiu a conta, CCO-6)
  wallet_name_snapshot text,
  -- invoice_payment: cartão cuja fatura foi paga
  to_wallet_id         uuid references public.wallets(id) on delete set null,
  place                text,
  description          text,
  created_by           uuid default auth.uid() references auth.users(id) on delete set null,
  assigned_to          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  bill_id              uuid references public.bills(id) on delete set null,
  installment_group_id uuid references public.installment_groups(id) on delete set null,
  installment_n        integer,
  installments_total   integer,
  invoice_ref          date check (invoice_ref is null or extract(day from invoice_ref) = 1),
  source               text not null default 'manual' check (source in (
                         'manual', 'back_tap', 'apple_pay', 'notification', 'photo', 'csv', 'import', 'system')),
  status               text not null default 'confirmed' check (status in ('confirmed', 'pending')),
  source_data          jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.bill_occurrences
  add constraint bill_occurrences_transaction_fk foreign key (transaction_id) references public.transactions(id) on delete set null;

-- Estado de pagamento da fatura (os valores vêm da view invoice_totals).
create table public.invoices (
  id                     uuid primary key default gen_random_uuid(),
  wallet_id              uuid not null references public.wallets(id) on delete cascade,
  ref_month              date not null check (extract(day from ref_month) = 1),
  closing_date           date not null,
  due_date               date not null,
  paid_at                date,
  payment_transaction_id uuid references public.transactions(id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (wallet_id, ref_month)
);

create table public.budgets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ref_month    date not null check (extract(day from ref_month) = 1),
  total_amount bigint not null check (total_amount >= 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, ref_month)
);

create table public.category_goals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category_id    uuid not null references public.categories(id) on delete cascade,
  goal_amount    bigint not null check (goal_amount >= 0),
  effective_from date not null check (extract(day from effective_from) = 1),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (category_id, effective_from)
);

create table public.settlements (
  id                     uuid primary key default gen_random_uuid(),
  wallet_id              uuid references public.wallets(id) on delete set null,
  debtor_id              uuid not null references auth.users(id) on delete cascade,
  holder_id              uuid not null references auth.users(id) on delete cascade,
  invoice_ref            date not null check (extract(day from invoice_ref) = 1),
  amount                 bigint not null check (amount > 0),
  status                 text not null default 'open' check (status in ('open', 'reported', 'confirmed')),
  reported_at            timestamptz,
  confirmed_at           timestamptz,
  debtor_transaction_id  uuid references public.transactions(id) on delete set null,
  holder_transaction_id  uuid references public.transactions(id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create table public.notification_settings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type        text not null check (type in ('bill_due', 'log_reminder', 'weekly_summary', 'smart_alerts', 'family_events')),
  enabled     boolean not null default true,
  time        time,
  days_before smallint check (days_before between 0 and 30),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, type)
);

create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.automation_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name         text not null,
  token_hash   text not null unique,
  last_used_at timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.app_news (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  body         text not null default '',
  published_at timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.news_reads (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  news_id    uuid not null references public.app_news(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, news_id)
);

create table public.feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid default auth.uid() references auth.users(id) on delete set null,
  message    text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================================
-- 2. índices (todas as FKs + consultas por mês)
-- =====================================================================

create index family_members_family_idx on public.family_members (family_id);
create index families_created_by_idx on public.families (created_by);
create index profiles_default_wallet_idx on public.profiles (default_wallet_id);
create index wallets_owner_idx on public.wallets (owner_id);
create index wallet_shares_user_idx on public.wallet_shares (user_id);
create index wallet_aliases_wallet_idx on public.wallet_aliases (wallet_id);
create index categories_user_idx on public.categories (user_id, type, sort_order);
create index installment_groups_created_by_idx on public.installment_groups (created_by);
create index installment_groups_wallet_idx on public.installment_groups (wallet_id);
create index bills_user_idx on public.bills (user_id);
create index bills_category_idx on public.bills (category_id);
create index bill_occurrences_user_month_idx on public.bill_occurrences (user_id, ref_month);
create index bill_occurrences_transaction_idx on public.bill_occurrences (transaction_id);
create index transactions_assigned_date_idx on public.transactions (assigned_to, date);
create index transactions_wallet_invoice_idx on public.transactions (wallet_id, invoice_ref);
create index transactions_to_wallet_idx on public.transactions (to_wallet_id);
create index transactions_created_by_idx on public.transactions (created_by);
create index transactions_category_idx on public.transactions (category_id);
create index transactions_bill_idx on public.transactions (bill_id);
create index transactions_installment_group_idx on public.transactions (installment_group_id);
create index transactions_pending_idx on public.transactions (assigned_to) where status = 'pending';
create index invoices_payment_tx_idx on public.invoices (payment_transaction_id);
create index category_goals_user_idx on public.category_goals (user_id);
create index settlements_wallet_idx on public.settlements (wallet_id, invoice_ref);
create index settlements_debtor_idx on public.settlements (debtor_id);
create index settlements_holder_idx on public.settlements (holder_id);
create index settlements_debtor_tx_idx on public.settlements (debtor_transaction_id);
create index settlements_holder_tx_idx on public.settlements (holder_transaction_id);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);
create index automation_tokens_user_idx on public.automation_tokens (user_id);
create index news_reads_news_idx on public.news_reads (news_id);
create index feedback_user_idx on public.feedback (user_id);

-- =====================================================================
-- 3. updated_at em todas as tabelas
-- =====================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'families', 'family_members', 'wallets', 'wallet_shares', 'wallet_aliases', 'categories',
    'installment_groups', 'bills', 'bill_occurrences', 'transactions', 'invoices', 'budgets', 'category_goals',
    'settlements', 'notification_settings', 'push_subscriptions', 'automation_tokens', 'app_news', 'news_reads', 'feedback']
  loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
                   t || '_set_updated_at', t);
  end loop;
end $$;

-- =====================================================================
-- 4. funções auxiliares (usadas nas políticas; security definer para não depender de RLS)
-- =====================================================================

create function public.month_start(p_date date) returns date
language sql immutable set search_path = '' as $$
  select p_date - (extract(day from p_date)::int - 1)
$$;

-- dia do mês limitado ao último dia (ex.: dia 31 em fevereiro vira 28/29)
create function public.clamp_day(p_month date, p_day integer) returns date
language sql immutable set search_path = '' as $$
  select public.month_start(p_month)
         + (least(p_day, extract(day from (public.month_start(p_month) + interval '1 month' - interval '1 day'))::int) - 1)
$$;

create function public.my_family_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select family_id from public.family_members where user_id = (select auth.uid()) and status = 'active'
$$;

create function public.same_family(p_a uuid, p_b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.family_members a
    join public.family_members b on b.family_id = a.family_id
    where a.user_id = p_a and b.user_id = p_b and a.status = 'active' and b.status = 'active'
  )
$$;

create function public.is_family_admin(p_family uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.family_members
    where family_id = p_family and user_id = (select auth.uid()) and role = 'admin' and status = 'active'
  )
$$;

create function public.wallet_owner(p_wallet uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select owner_id from public.wallets where id = p_wallet
$$;

create function public.wallet_is_credit(p_wallet uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select type = 'credit' from public.wallets where id = p_wallet), false)
$$;

create function public.has_wallet_access(p_wallet uuid, p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.wallets w
    where w.id = p_wallet
      and (
        w.owner_id = p_user
        or (
          w.active
          and w.share_scope <> 'none'
          and public.same_family(w.owner_id, p_user)
          and (w.share_scope = 'family'
               or exists (select 1 from public.wallet_shares s where s.wallet_id = w.id and s.user_id = p_user))
        )
      )
  )
$$;

-- Fatura em que a compra cai (7.5): mês do fechamento, guardado no dia 1.
create function public.invoice_ref_for(p_wallet uuid, p_date date) returns date
language plpgsql stable security definer set search_path = '' as $$
declare
  w public.wallets;
  v_closing date;
begin
  select * into w from public.wallets where id = p_wallet;
  if w.id is null or w.type <> 'credit' then
    return null;
  end if;
  v_closing := public.clamp_day(p_date, w.closing_day);
  if p_date < v_closing or (p_date = v_closing and w.closing_day_inclusive) then
    return public.month_start(p_date);
  end if;
  return (public.month_start(p_date) + interval '1 month')::date;
end $$;

create function public.invoice_closing_date(p_wallet uuid, p_ref date) returns date
language sql stable security definer set search_path = '' as $$
  select public.clamp_day(p_ref, w.closing_day) from public.wallets w where w.id = p_wallet
$$;

-- Vencimento no mesmo mês do fechamento quando due_day > closing_day; senão no mês seguinte.
create function public.invoice_due_date(p_wallet uuid, p_ref date) returns date
language sql stable security definer set search_path = '' as $$
  select case when w.due_day > w.closing_day
              then public.clamp_day(p_ref, w.due_day)
              else public.clamp_day((p_ref + interval '1 month')::date, w.due_day) end
  from public.wallets w where w.id = p_wallet
$$;

create function public.invoice_is_paid(p_wallet uuid, p_ref date) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.invoices where wallet_id = p_wallet and ref_month = p_ref and paid_at is not null)
$$;

-- =====================================================================
-- 5. regras de transação (trigger)
-- =====================================================================

create function public.transactions_before_write() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_old_owner uuid;
begin
  if tg_op in ('UPDATE', 'DELETE') and v_uid is not null then
    v_old_owner := public.wallet_owner(old.wallet_id);
    -- ATR-6: depois do fechamento, só o titular altera compras do cartão.
    if v_old_owner is distinct from v_uid
       and old.invoice_ref is not null
       and public.invoice_closing_date(old.wallet_id, old.invoice_ref) < public.today_br() then
      raise exception 'Fatura já fechou. Só o titular do cartão pode alterar esta compra.';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  new.created_by := coalesce(new.created_by, v_uid);
  new.assigned_to := coalesce(new.assigned_to, new.created_by);

  if new.status = 'confirmed' and new.type <> 'income' and new.wallet_id is null and tg_op = 'INSERT' then
    raise exception 'Escolha a carteira.';
  end if;

  -- Compra no crédito: calcula a fatura. Pagamento de fatura mantém a referência informada.
  if new.type = 'expense' then
    new.invoice_ref := public.invoice_ref_for(new.wallet_id, new.date);
  elsif new.type not in ('invoice_payment', 'settlement_payment') then
    new.invoice_ref := null;
  end if;

  -- ATR-3: reatribuição só com fatura em aberto.
  if tg_op = 'UPDATE' and new.assigned_to is distinct from old.assigned_to
     and old.invoice_ref is not null and public.invoice_is_paid(old.wallet_id, old.invoice_ref) then
    raise exception 'Fatura já quitada. Não dá para mudar de quem é a compra.';
  end if;

  return new;
end $$;

create trigger transactions_before_insert_update
  before insert or update on public.transactions
  for each row execute function public.transactions_before_write();

create trigger transactions_before_delete
  before delete on public.transactions
  for each row execute function public.transactions_before_write();

-- Carteira apagada (ex.: exclusão de conta do titular): guarda o nome nas compras que ficam com os membros.
-- Só as compras de outras pessoas sobrevivem; created_by do dono que está saindo vira null
-- (senão a FK falha durante a cascata da exclusão de conta).
create function public.wallets_before_delete() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.transactions
  set wallet_name_snapshot = old.name,
      created_by = case when created_by = old.owner_id then null else created_by end
  where wallet_id = old.id and assigned_to <> old.owner_id;
  return old;
end $$;

create trigger wallets_before_delete
  before delete on public.wallets
  for each row execute function public.wallets_before_delete();

-- FAM-7 e limpeza de compartilhamentos quando alguém sai da família.
create function public.family_members_after_delete() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_next uuid;
begin
  delete from public.wallet_shares s
  using public.wallets w
  where s.wallet_id = w.id and (s.user_id = old.user_id or w.owner_id = old.user_id);

  if not exists (select 1 from public.families where id = old.family_id) then
    return old;
  end if;

  if old.role = 'admin' and old.status = 'active' then
    select id into v_next from public.family_members
    where family_id = old.family_id and status = 'active'
    order by joined_at nulls last, created_at
    limit 1;

    if v_next is null then
      delete from public.families where id = old.family_id;
    else
      update public.family_members set role = 'admin' where id = v_next;
    end if;
  end if;
  return old;
end $$;

create trigger family_members_after_delete
  after delete on public.family_members
  for each row execute function public.family_members_after_delete();

-- =====================================================================
-- 6. RLS
-- =====================================================================

alter table public.profiles enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_shares enable row level security;
alter table public.wallet_aliases enable row level security;
alter table public.categories enable row level security;
alter table public.installment_groups enable row level security;
alter table public.bills enable row level security;
alter table public.bill_occurrences enable row level security;
alter table public.transactions enable row level security;
alter table public.invoices enable row level security;
alter table public.budgets enable row level security;
alter table public.category_goals enable row level security;
alter table public.settlements enable row level security;
alter table public.notification_settings enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.automation_tokens enable row level security;
alter table public.app_news enable row level security;
alter table public.news_reads enable row level security;
alter table public.feedback enable row level security;

-- dados só do próprio usuário (coluna user_id)
do $$
declare t text;
begin
  foreach t in array array[
    'wallet_aliases', 'bills', 'bill_occurrences', 'budgets', 'category_goals',
    'notification_settings', 'push_subscriptions', 'automation_tokens', 'news_reads']
  loop
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

create policy "own profile read" on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy "own profile update" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- família: leitura por quem pertence (inclusive pendente, para ver o nome). Escrita só por RPC.
create policy "family read" on public.families for select to authenticated
  using (exists (select 1 from public.family_members m where m.family_id = families.id and m.user_id = (select auth.uid())));

create policy "family members read" on public.family_members for select to authenticated
  using (user_id = (select auth.uid()) or family_id = public.my_family_id());

-- carteiras: o dono faz tudo; membro vê cartão compartilhado pela função shared_wallets() (colunas limitadas).
create policy "wallet owner read" on public.wallets for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "wallet owner insert" on public.wallets for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy "wallet owner update" on public.wallets for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
-- CAR-7: carteira com lançamento só pode ser arquivada
create policy "wallet owner delete unused" on public.wallets for delete to authenticated
  using (owner_id = (select auth.uid())
         and not exists (select 1 from public.transactions t where t.wallet_id = wallets.id or t.to_wallet_id = wallets.id));

create policy "wallet shares owner" on public.wallet_shares for all to authenticated
  using (public.wallet_owner(wallet_id) = (select auth.uid()))
  with check (public.wallet_owner(wallet_id) = (select auth.uid()) and public.same_family((select auth.uid()), user_id));
create policy "wallet shares self read" on public.wallet_shares for select to authenticated
  using (user_id = (select auth.uid()));

-- categorias: só do usuário; CAT-5: com lançamento só arquiva
create policy "categories read" on public.categories for select to authenticated
  using (user_id = (select auth.uid()));
create policy "categories insert" on public.categories for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "categories update" on public.categories for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "categories delete unused" on public.categories for delete to authenticated
  using (user_id = (select auth.uid())
         and not exists (select 1 from public.transactions t where t.category_id = categories.id)
         and not exists (select 1 from public.bills b where b.category_id = categories.id));

create policy "installment groups read" on public.installment_groups for select to authenticated
  using (created_by = (select auth.uid()) or public.wallet_owner(wallet_id) = (select auth.uid()));
create policy "installment groups insert" on public.installment_groups for insert to authenticated
  with check (created_by = (select auth.uid())
              and (wallet_id is null or public.has_wallet_access(wallet_id, (select auth.uid()))));
create policy "installment groups update" on public.installment_groups for update to authenticated
  using (created_by = (select auth.uid()) or public.wallet_owner(wallet_id) = (select auth.uid()));
create policy "installment groups delete" on public.installment_groups for delete to authenticated
  using (created_by = (select auth.uid()) or public.wallet_owner(wallet_id) = (select auth.uid()));

-- transações (6.1 e 5.7.6):
--   leitura: o que está atribuído a mim + tudo lançado nas minhas carteiras
--   escrita: titular em tudo do cartão; membro só no que registrou e é dele (fatura aberta, ver trigger)
create policy "transactions read" on public.transactions for select to authenticated
  using (assigned_to = (select auth.uid())
         or public.wallet_owner(wallet_id) = (select auth.uid()));

create policy "transactions insert" on public.transactions for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (wallet_id is null or public.has_wallet_access(wallet_id, (select auth.uid())))
    and (to_wallet_id is null or public.wallet_owner(to_wallet_id) = (select auth.uid()))
    and (assigned_to = (select auth.uid())
         or (public.wallet_owner(wallet_id) = (select auth.uid()) and public.has_wallet_access(wallet_id, assigned_to)))
  );

create policy "transactions update" on public.transactions for update to authenticated
  using (public.wallet_owner(wallet_id) = (select auth.uid())
         or (assigned_to = (select auth.uid()) and (wallet_id is null or created_by = (select auth.uid()))))
  with check (
    (wallet_id is null or public.has_wallet_access(wallet_id, (select auth.uid())))
    and (to_wallet_id is null or public.wallet_owner(to_wallet_id) = (select auth.uid()))
    and (assigned_to = (select auth.uid())
         or (public.wallet_owner(wallet_id) = (select auth.uid()) and public.has_wallet_access(wallet_id, assigned_to)))
  );

create policy "transactions delete" on public.transactions for delete to authenticated
  using (public.wallet_owner(wallet_id) = (select auth.uid())
         or (assigned_to = (select auth.uid()) and (wallet_id is null or created_by = (select auth.uid()))));

create policy "invoices owner" on public.invoices for all to authenticated
  using (public.wallet_owner(wallet_id) = (select auth.uid()))
  with check (public.wallet_owner(wallet_id) = (select auth.uid()));

create policy "settlements parties read" on public.settlements for select to authenticated
  using (debtor_id = (select auth.uid()) or holder_id = (select auth.uid()));
create policy "settlements parties insert" on public.settlements for insert to authenticated
  with check ((debtor_id = (select auth.uid()) or holder_id = (select auth.uid()))
              and public.wallet_owner(wallet_id) = holder_id);
create policy "settlements parties update" on public.settlements for update to authenticated
  using (debtor_id = (select auth.uid()) or holder_id = (select auth.uid()))
  with check (debtor_id = (select auth.uid()) or holder_id = (select auth.uid()));

create policy "news read" on public.app_news for select to authenticated using (true);

create policy "feedback insert" on public.feedback for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "feedback read own" on public.feedback for select to authenticated
  using (user_id = (select auth.uid()));

-- =====================================================================
-- 7. views (security_invoker: respeitam o RLS de quem consulta)
-- =====================================================================

-- Fatura por cartão, mês e pessoa. O membro só enxerga a própria fatia; o titular vê todas (VIS-1, VIS-3).
create view public.invoice_totals with (security_invoker = true) as
select t.wallet_id, t.invoice_ref, t.assigned_to,
       sum(t.amount)::bigint as total, count(*)::int as purchases
from public.transactions t
where t.type = 'expense' and t.status = 'confirmed' and t.invoice_ref is not null
group by t.wallet_id, t.invoice_ref, t.assigned_to;

-- CAT-3: quantidade de lançamentos por categoria
create view public.category_usage with (security_invoker = true) as
select t.category_id, count(*)::int as transactions
from public.transactions t
where t.assigned_to = (select auth.uid()) and t.status = 'confirmed' and t.category_id is not null
group by t.category_id;

-- =====================================================================
-- 8. novo usuário: perfil, Pix e Dinheiro (CAR-1), categorias padrão, notificações
-- =====================================================================

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_pix uuid;
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'name', ''), split_part(new.email, '@', 1), ''));

  insert into public.wallets (owner_id, name, type, finish, sort_order)
  values (new.id, 'Pix', 'pix', 'black', 0) returning id into v_pix;
  insert into public.wallets (owner_id, name, type, finish, sort_order)
  values (new.id, 'Dinheiro', 'cash', 'graphite', 1);
  update public.profiles set default_wallet_id = v_pix where id = new.id;

  insert into public.categories (user_id, type, name, icon, color, class, sort_order) values
    (new.id, 'expense', 'Alimentação', 'utensils',     'orange', 'essential', 0),
    (new.id, 'expense', 'Transporte',  'car',          'blue',   'essential', 1),
    (new.id, 'expense', 'Saúde',       'heart-pulse',  'red',    'essential', 2),
    (new.id, 'expense', 'Assinaturas', 'repeat',       'indigo', 'desire',    3),
    (new.id, 'expense', 'Lazer',       'gamepad-2',    'pink',   'desire',    4),
    (new.id, 'expense', 'Moradia',     'home',         'green',  'essential', 5),
    (new.id, 'expense', 'Educação',    'book',         'purple', 'essential', 6),
    (new.id, 'expense', 'Outros',      'ellipsis',     'gray',   'desire',    7),
    (new.id, 'income',  'Salário',     'briefcase',    'green',  null, 0),
    (new.id, 'income',  'Freelance',   'laptop',       'blue',   null, 1),
    (new.id, 'income',  'Investimentos','trending-up', 'purple', null, 2),
    (new.id, 'income',  'Reembolso',   'undo',         'teal',   null, 3),
    (new.id, 'income',  'Presente',    'gift',         'pink',   null, 4),
    (new.id, 'income',  'Outros',      'plus-circle',  'gray',   null, 5);

  insert into public.notification_settings (user_id, type, enabled, time, days_before) values
    (new.id, 'bill_due',       true, '09:00', 2),
    (new.id, 'log_reminder',   true, '21:00', null),
    (new.id, 'weekly_summary', true, '20:00', null),
    (new.id, 'smart_alerts',   true, null,    null),
    (new.id, 'family_events',  true, null,    null);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- 9. RPCs: família (5.7.2)
-- =====================================================================

create function public.generate_family_code() returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- sem 0, O, 1, I
  v_code text;
  v_bytes bytea;
  i integer;
begin
  loop
    v_bytes := extensions.gen_random_bytes(8);
    v_code := '';
    for i in 0..7 loop
      v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, i) % 32) + 1, 1);
    end loop;
    exit when not exists (select 1 from public.families where code = v_code);
  end loop;
  return v_code;
end $$;

create function public.create_family(p_name text) returns public.families
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  f public.families;
begin
  if v_uid is null then raise exception 'Não autenticado'; end if;
  if exists (select 1 from public.family_members where user_id = v_uid) then
    raise exception 'Você já participa de uma família.';
  end if;
  insert into public.families (name, code, created_by)
  values (trim(p_name), public.generate_family_code(), v_uid) returning * into f;
  insert into public.family_members (family_id, user_id, role, status, joined_at)
  values (f.id, v_uid, 'admin', 'active', now());
  return f;
end $$;

create function public.join_family(p_code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  f public.families;
begin
  if v_uid is null then raise exception 'Não autenticado'; end if;
  if exists (select 1 from public.family_members where user_id = v_uid) then
    raise exception 'Você já participa de uma família.';
  end if;
  select * into f from public.families where code = upper(trim(p_code));
  if f.id is null then raise exception 'Código inválido.'; end if;
  if f.entries_paused then raise exception 'Esta família não está aceitando novas entradas.'; end if;
  insert into public.family_members (family_id, user_id, role, status) values (f.id, v_uid, 'member', 'pending');
  return f.id;
end $$;

create function public.regenerate_family_code() returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_family uuid := public.my_family_id();
  v_code text;
begin
  if not public.is_family_admin(v_family) then raise exception 'Só o admin pode gerar um novo código.'; end if;
  v_code := public.generate_family_code();
  update public.families set code = v_code where id = v_family;
  return v_code;
end $$;

create function public.set_family_entries_paused(p_paused boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare v_family uuid := public.my_family_id();
begin
  if not public.is_family_admin(v_family) then raise exception 'Só o admin pode alterar.'; end if;
  update public.families set entries_paused = p_paused where id = v_family;
end $$;

create function public.rename_family(p_name text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_family uuid := public.my_family_id();
begin
  if not public.is_family_admin(v_family) then raise exception 'Só o admin pode alterar.'; end if;
  update public.families set name = trim(p_name) where id = v_family;
end $$;

create function public.approve_family_member(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_family uuid := public.my_family_id();
begin
  if not public.is_family_admin(v_family) then raise exception 'Só o admin pode aprovar.'; end if;
  update public.family_members set status = 'active', joined_at = now()
  where family_id = v_family and user_id = p_user and status = 'pending';
  if not found then raise exception 'Pedido de entrada não encontrado.'; end if;
end $$;

create function public.remove_family_member(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_family uuid := public.my_family_id();
begin
  if not public.is_family_admin(v_family) then raise exception 'Só o admin pode remover membros.'; end if;
  if p_user = auth.uid() then raise exception 'Para sair, use a opção Sair da família.'; end if;
  delete from public.family_members where family_id = v_family and user_id = p_user;
  if not found then raise exception 'Membro não encontrado.'; end if;
end $$;

create function public.leave_family() returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.family_members where user_id = auth.uid();
end $$;

-- Lista de membros com nome e avatar (FAM-5), sem expor o resto do perfil.
create function public.family_members_list()
returns table (user_id uuid, name text, avatar_color text, role text, status text, joined_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select m.user_id, p.name, p.avatar_color, m.role, m.status, m.joined_at
  from public.family_members m
  join public.profiles p on p.id = m.user_id
  where m.family_id = (select family_id from public.family_members where user_id = (select auth.uid()))
    and (m.status = 'active' or public.is_family_admin(m.family_id) or m.user_id = (select auth.uid()))
  order by m.joined_at nulls last, m.created_at
$$;

-- Cartões de outras pessoas que eu posso usar (CCO-2): só nome, acabamento, fechamento e vencimento.
create function public.shared_wallets()
returns table (id uuid, name text, finish text, closing_day smallint, due_day smallint, owner_id uuid, owner_name text)
language sql stable security definer set search_path = '' as $$
  select w.id, w.name, w.finish, w.closing_day, w.due_day, w.owner_id, p.name
  from public.wallets w
  join public.profiles p on p.id = w.owner_id
  where w.owner_id <> (select auth.uid())
    and public.has_wallet_access(w.id, (select auth.uid()))
  order by p.name, w.name
$$;

-- =====================================================================
-- 10. RPCs: compras, contas e faturas (security invoker: valem as políticas)
-- =====================================================================

-- ATR-2 / ATR-4: "De quem é essa compra?" vale para todas as parcelas com fatura em aberto.
create function public.assign_purchase(p_transaction uuid, p_user uuid) returns integer
language plpgsql security invoker set search_path = '' as $$
declare
  t public.transactions;
  v_count integer;
begin
  select * into t from public.transactions where id = p_transaction;
  if t.id is null then raise exception 'Compra não encontrada.'; end if;
  if public.wallet_owner(t.wallet_id) is distinct from auth.uid() then
    raise exception 'Só o titular do cartão define de quem é a compra.';
  end if;

  update public.transactions x set assigned_to = p_user
  where (x.id = t.id or (t.installment_group_id is not null and x.installment_group_id = t.installment_group_id))
    and x.wallet_id = t.wallet_id
    and (x.invoice_ref is null or not public.invoice_is_paid(x.wallet_id, x.invoice_ref));
  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- Parcelamento (7.6): um lançamento por mês, cada um na sua fatura.
create function public.create_installment_purchase(
  p_wallet uuid, p_category uuid, p_total bigint, p_installments integer, p_first_date date,
  p_place text default null, p_description text default null,
  p_source text default 'manual', p_status text default 'confirmed'
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_group uuid;
  v_base bigint;
  v_rest bigint;
  n integer;
begin
  if p_installments < 1 then raise exception 'Número de parcelas inválido.'; end if;
  insert into public.installment_groups (wallet_id, description, total_amount, installments_total, first_date)
  values (p_wallet, coalesce(p_description, p_place, ''), p_total, p_installments, p_first_date)
  returning id into v_group;

  v_base := p_total / p_installments;
  v_rest := p_total - v_base * p_installments; -- centavos que sobram vão na 1ª parcela
  for n in 1..p_installments loop
    insert into public.transactions
      (type, amount, date, category_id, wallet_id, place, description,
       installment_group_id, installment_n, installments_total, source, status)
    values
      ('expense', v_base + case when n = 1 then v_rest else 0 end,
       (p_first_date + make_interval(months => n - 1))::date,
       p_category, p_wallet, p_place, p_description, v_group, n, p_installments, p_source, p_status);
  end loop;
  return v_group;
end $$;

-- Gera as ocorrências de contas do mês (CON-4, CON-5). Chamada pelo app e pelo pg_cron.
-- Com usuário logado gera só as dele; sem usuário (cron) gera para todos.
create function public.ensure_bill_occurrences(p_month date) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_month date := public.month_start(p_month);
  b public.bills;
  v_offset integer;
  v_n integer;
  v_count integer := 0;
begin
  for b in
    select * from public.bills
    where active and start_month <= v_month and (v_uid is null or user_id = v_uid)
  loop
    v_offset := (extract(year from v_month) - extract(year from b.start_month)) * 12
              + (extract(month from v_month) - extract(month from b.start_month));
    v_n := null;
    if b.installments_total is not null then
      v_n := b.installment_current + v_offset;
      if v_n > b.installments_total then
        update public.bills set active = false where id = b.id;
        continue;
      end if;
    elsif not b.recurring and v_offset > 0 then
      continue;
    end if;

    insert into public.bill_occurrences (bill_id, user_id, ref_month, installment_n, amount, due_date)
    values (b.id, b.user_id, v_month, v_n, b.amount,
            public.clamp_day((v_month + case when b.due_next_month then interval '1 month' else interval '0' end)::date, b.due_day))
    on conflict (bill_id, ref_month) do nothing;
    if found then v_count := v_count + 1; end if;
  end loop;
  return v_count;
end $$;

-- CON-6: marcar conta como paga gera o gasto e liga à ocorrência (sem duplicar).
create function public.pay_bill_occurrence(p_occurrence uuid, p_wallet uuid, p_date date default null)
returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  o public.bill_occurrences;
  b public.bills;
  v_tx uuid;
begin
  select * into o from public.bill_occurrences where id = p_occurrence;
  if o.id is null then raise exception 'Conta não encontrada.'; end if;
  if o.paid_at is not null then raise exception 'Esta conta já está paga.'; end if;
  select * into b from public.bills where id = o.bill_id;

  insert into public.transactions (type, amount, date, category_id, wallet_id, place, bill_id, description)
  values ('expense', o.amount, coalesce(p_date, public.today_br()), b.category_id, p_wallet, b.name, b.id,
          case when o.installment_n is not null then o.installment_n || ' de ' || b.installments_total end)
  returning id into v_tx;

  update public.bill_occurrences set paid_at = coalesce(p_date, public.today_br()), transaction_id = v_tx
  where id = o.id;
  return v_tx;
end $$;

create function public.unpay_bill_occurrence(p_occurrence uuid) returns void
language plpgsql security invoker set search_path = '' as $$
declare o public.bill_occurrences;
begin
  select * into o from public.bill_occurrences where id = p_occurrence;
  if o.id is null then raise exception 'Conta não encontrada.'; end if;
  update public.bill_occurrences set paid_at = null, transaction_id = null where id = o.id;
  if o.transaction_id is not null then
    delete from public.transactions where id = o.transaction_id;
  end if;
end $$;

-- Pagamento da fatura: sai do caixa do titular (7.1) e marca a fatura como quitada.
create function public.pay_invoice(
  p_card uuid, p_ref date, p_from_wallet uuid, p_date date default null, p_amount bigint default null
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_ref date := public.month_start(p_ref);
  v_amount bigint;
  v_tx uuid;
begin
  if public.wallet_owner(p_card) is distinct from auth.uid() then
    raise exception 'Só o titular paga a fatura.';
  end if;
  v_amount := coalesce(p_amount,
    (select sum(total) from public.invoice_totals where wallet_id = p_card and invoice_ref = v_ref));
  if coalesce(v_amount, 0) <= 0 then raise exception 'Fatura sem valor.'; end if;

  insert into public.transactions (type, amount, date, wallet_id, to_wallet_id, invoice_ref, description)
  values ('invoice_payment', v_amount, coalesce(p_date, public.today_br()), p_from_wallet, p_card, v_ref, 'Pagamento de fatura')
  returning id into v_tx;

  insert into public.invoices (wallet_id, ref_month, closing_date, due_date, paid_at, payment_transaction_id)
  values (p_card, v_ref, public.invoice_closing_date(p_card, v_ref), public.invoice_due_date(p_card, v_ref),
          coalesce(p_date, public.today_br()), v_tx)
  on conflict (wallet_id, ref_month) do update
    set paid_at = excluded.paid_at, payment_transaction_id = excluded.payment_transaction_id;
  return v_tx;
end $$;

-- =====================================================================
-- 11. RPCs: números do mês (seção 7)
-- =====================================================================

-- Resumo do mês do usuário logado. Saldo pelo regime de caixa (7.1); gasto pela data da compra.
create function public.month_summary(p_month date) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_start date := public.month_start(p_month);
  v_end date := (public.month_start(p_month) + interval '1 month')::date;
  v_carry boolean;
  r record;
  v_opening bigint := 0;
  v_receivable bigint;
begin
  select carry_over_balance into v_carry from public.profiles where id = v_uid;

  select
    coalesce(sum(amount) filter (where type = 'income'), 0) as income,
    coalesce(sum(amount) filter (where type = 'expense'), 0) as spending,
    coalesce(sum(amount) filter (where type = 'expense' and not public.wallet_is_credit(wallet_id)), 0) as cash_expense,
    coalesce(sum(amount) filter (where type = 'save_apply'), 0) as saved,
    coalesce(sum(amount) filter (where type = 'save_redeem'), 0) as redeemed,
    coalesce(sum(amount) filter (where type = 'invoice_payment'), 0) as invoice_paid,
    coalesce(sum(amount) filter (where type = 'settlement_payment'), 0) as settlement_paid,
    count(*) filter (where type = 'expense') as expense_count
  into r
  from public.transactions
  where assigned_to = v_uid and status = 'confirmed' and date >= v_start and date < v_end;

  if v_carry then
    select
      coalesce(sum(case
        when type in ('income', 'save_redeem') then amount
        when type = 'expense' and public.wallet_is_credit(wallet_id) then 0
        else -amount end), 0)
    into v_opening
    from public.transactions
    where assigned_to = v_uid and status = 'confirmed' and date < v_start;
  end if;

  -- A receber de membros (5.7.7): compras de outras pessoas nos meus cartões, menos acertos confirmados.
  select coalesce(sum(it.total), 0)
       - coalesce((select sum(s.amount) from public.settlements s
                   where s.holder_id = v_uid and s.status = 'confirmed'), 0)
  into v_receivable
  from public.invoice_totals it
  join public.wallets w on w.id = it.wallet_id
  where w.owner_id = v_uid and it.assigned_to <> v_uid;

  return jsonb_build_object(
    'month', v_start,
    'income', r.income,
    'spending', r.spending,
    'expense_count', r.expense_count,
    'cash_expense', r.cash_expense,
    'saved', r.saved,
    'redeemed', r.redeemed,
    'invoice_paid', r.invoice_paid,
    'settlement_paid', r.settlement_paid,
    'opening_balance', v_opening,
    'balance', v_opening + r.income - r.cash_expense - r.saved + r.redeemed - r.invoice_paid - r.settlement_paid,
    'total_saved', (select coalesce(sum(case when type = 'save_apply' then amount else -amount end), 0)
                    from public.transactions
                    where assigned_to = v_uid and status = 'confirmed'
                      and type in ('save_apply', 'save_redeem') and date < v_end),
    'budget', (select total_amount from public.budgets where user_id = v_uid and ref_month = v_start),
    'receivable_from_members', greatest(v_receivable, 0),
    'pending_count', (select count(*) from public.transactions where assigned_to = v_uid and status = 'pending')
  );
end $$;

-- ANA-6: gasto por categoria no mês com a meta vigente.
create function public.category_spending(p_month date)
returns table (category_id uuid, name text, class text, total bigint, transactions integer, goal bigint)
language sql stable security invoker set search_path = '' as $$
  select c.id, c.name, c.class,
         coalesce(sum(t.amount), 0)::bigint,
         count(t.id)::int,
         (select g.goal_amount from public.category_goals g
          where g.category_id = c.id and g.effective_from <= public.month_start(p_month)
          order by g.effective_from desc limit 1)
  from public.categories c
  left join public.transactions t
    on t.category_id = c.id and t.type = 'expense' and t.status = 'confirmed'
   and t.assigned_to = (select auth.uid())
   and t.date >= public.month_start(p_month)
   and t.date < (public.month_start(p_month) + interval '1 month')::date
  where c.user_id = (select auth.uid()) and c.type = 'expense'
  group by c.id, c.name, c.class, c.sort_order
  order by 4 desc, c.sort_order
$$;

-- ANA-7: histórico mensal (gastos, receitas, guardado líquido) dos últimos N meses.
create function public.monthly_history(p_months integer default 6)
returns table (month date, spending bigint, income bigint, saved bigint)
language sql stable security invoker set search_path = '' as $$
  with months as (
    select (public.month_start(public.today_br()) - make_interval(months => g))::date as m
    from generate_series(0, greatest(p_months, 1) - 1) g
  )
  select m.m,
    coalesce(sum(t.amount) filter (where t.type = 'expense'), 0)::bigint,
    coalesce(sum(t.amount) filter (where t.type = 'income'), 0)::bigint,
    (coalesce(sum(t.amount) filter (where t.type = 'save_apply'), 0)
     - coalesce(sum(t.amount) filter (where t.type = 'save_redeem'), 0))::bigint
  from months m
  left join public.transactions t
    on t.assigned_to = (select auth.uid()) and t.status = 'confirmed'
   and t.date >= m.m and t.date < (m.m + interval '1 month')::date
  group by m.m
  order by m.m desc
$$;

-- VIS-1 / 7.7: quanto eu devo a cada titular, por fatura, descontando acertos confirmados.
create function public.my_card_debts()
returns table (wallet_id uuid, invoice_ref date, due_date date, total bigint, settled bigint, open bigint)
language sql stable security invoker set search_path = '' as $$
  select it.wallet_id, it.invoice_ref, public.invoice_due_date(it.wallet_id, it.invoice_ref),
         it.total,
         coalesce(s.amount, 0)::bigint,
         greatest(it.total - coalesce(s.amount, 0), 0)::bigint
  from public.invoice_totals it
  left join lateral (
    select sum(x.amount) as amount from public.settlements x
    where x.wallet_id = it.wallet_id and x.invoice_ref = it.invoice_ref
      and x.debtor_id = (select auth.uid()) and x.status = 'confirmed'
  ) s on true
  where it.assigned_to = (select auth.uid())
    and public.wallet_owner(it.wallet_id) is distinct from (select auth.uid())
  order by it.invoice_ref
$$;

-- =====================================================================
-- 12. excluir conta (ACE-5, CCO-6, CCO-7)
-- =====================================================================

create function public.delete_account() returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Não autenticado'; end if;
  delete from public.family_members where user_id = v_uid; -- aplica FAM-7 antes
  delete from auth.users where id = v_uid;                   -- o resto sai em cascata
end $$;

-- =====================================================================
-- 13. permissões das funções
-- =====================================================================

do $$
declare f text;
begin
  -- funções internas: ninguém de fora executa
  foreach f in array array[
    'public.handle_new_user()',
    'public.transactions_before_write()',
    'public.wallets_before_delete()',
    'public.family_members_after_delete()',
    'public.generate_family_code()'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
  end loop;

  -- auxiliares das políticas e RPCs do app: só usuário logado
  foreach f in array array[
    'public.month_start(date)', 'public.clamp_day(date, integer)',
    'public.my_family_id()', 'public.same_family(uuid, uuid)', 'public.is_family_admin(uuid)',
    'public.wallet_owner(uuid)', 'public.wallet_is_credit(uuid)', 'public.has_wallet_access(uuid, uuid)',
    'public.invoice_ref_for(uuid, date)', 'public.invoice_closing_date(uuid, date)',
    'public.invoice_due_date(uuid, date)', 'public.invoice_is_paid(uuid, date)',
    'public.create_family(text)', 'public.join_family(text)', 'public.regenerate_family_code()',
    'public.set_family_entries_paused(boolean)', 'public.rename_family(text)',
    'public.approve_family_member(uuid)', 'public.remove_family_member(uuid)', 'public.leave_family()',
    'public.family_members_list()', 'public.shared_wallets()',
    'public.assign_purchase(uuid, uuid)',
    'public.create_installment_purchase(uuid, uuid, bigint, integer, date, text, text, text, text)',
    'public.ensure_bill_occurrences(date)', 'public.pay_bill_occurrence(uuid, uuid, date)',
    'public.unpay_bill_occurrence(uuid)', 'public.pay_invoice(uuid, date, uuid, date, bigint)',
    'public.month_summary(date)', 'public.category_spending(date)', 'public.monthly_history(integer)',
    'public.my_card_debts()', 'public.delete_account()'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

-- =====================================================================
-- 14. tarefa diária: contas do mês atual e do próximo
-- =====================================================================

select cron.schedule(
  'troco-bill-occurrences',
  '17 3 * * *',
  $$select public.ensure_bill_occurrences(public.today_br());
    select public.ensure_bill_occurrences((public.today_br() + interval '1 month')::date);$$
);
