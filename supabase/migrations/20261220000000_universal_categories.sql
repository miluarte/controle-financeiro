-- Categorias universais com subcategorias (pedido da Milena, 2026-11-27).
-- Antes cada pessoa tinha a própria lista; agora a lista é uma só, igual para todos, e ninguém edita.
-- Um nível: principal (parent_id nulo) e subcategorias (parent_id = principal), mesmo tipo.
-- Os gastos, contas e metas que apontavam para a categoria de cada pessoa passam para a universal
-- pela tabela de/para abaixo; as metas ficam sempre na principal. Depois as categorias antigas são apagadas.

-- 1. lista nova (temporária, por nome)
create temp table new_cat (type text, name text, parent text, icon text, color text, class text) on commit drop;
insert into new_cat values
  ('expense', 'Alimentação', null, 'utensils', 'orange', 'essential'),
  ('expense', 'Supermercado', 'Alimentação', 'cart', 'orange', 'essential'),
  ('expense', 'Alimentos e bebidas', 'Alimentação', 'chef-hat', 'orange', 'essential'),
  ('expense', 'Restaurantes, bares e lanchonetes', 'Alimentação', 'utensils', 'orange', 'essential'),
  ('expense', 'Delivery de alimentos', 'Alimentação', 'box', 'orange', 'essential'),
  ('expense', 'Compras', null, 'bag', 'pink', 'desire'),
  ('expense', 'Compras online', 'Compras', 'globe', 'pink', 'desire'),
  ('expense', 'Eletrônicos', 'Compras', 'laptop', 'pink', 'desire'),
  ('expense', 'Pet Shops e veterinários', 'Compras', 'paw', 'pink', 'desire'),
  ('expense', 'Artigos infantis', 'Compras', 'gift', 'pink', 'desire'),
  ('expense', 'Livraria', 'Compras', 'book', 'pink', 'desire'),
  ('expense', 'Artigos esportivos', 'Compras', 'football', 'pink', 'desire'),
  ('expense', 'Papelaria', 'Compras', 'document', 'pink', 'desire'),
  ('expense', 'Cashback', 'Compras', 'hand-money', 'pink', 'desire'),
  ('expense', 'Vestuário', null, 'hanger', 'fuchsia', 'desire'),
  ('expense', 'Roupas', 'Vestuário', 'shirt', 'fuchsia', 'desire'),
  ('expense', 'Calçados', 'Vestuário', 'hanger', 'fuchsia', 'desire'),
  ('expense', 'Bolsas e acessórios', 'Vestuário', 'bag', 'fuchsia', 'desire'),
  ('expense', 'Joias e bijuterias', 'Vestuário', 'gift', 'fuchsia', 'desire'),
  ('expense', 'Moda íntima e praia', 'Vestuário', 'shirt', 'fuchsia', 'desire'),
  ('expense', 'Roupas esportivas', 'Vestuário', 'shirt', 'fuchsia', 'desire'),
  ('expense', 'Tecidos e aviamentos', 'Vestuário', 'scissors', 'fuchsia', 'desire'),
  ('expense', 'Costura, ajustes e lavanderia', 'Vestuário', 'scissors', 'fuchsia', 'desire'),
  ('expense', 'Beleza e cuidados pessoais', null, 'cosmetic', 'rose', 'desire'),
  ('expense', 'Maquiagem', 'Beleza e cuidados pessoais', 'cosmetic', 'rose', 'desire'),
  ('expense', 'Skincare e cuidados com a pele', 'Beleza e cuidados pessoais', 'cosmetic', 'rose', 'desire'),
  ('expense', 'Cuidados com o cabelo', 'Beleza e cuidados pessoais', 'scissors', 'rose', 'desire'),
  ('expense', 'Perfumaria', 'Beleza e cuidados pessoais', 'cosmetic', 'rose', 'desire'),
  ('expense', 'Unhas e manicure', 'Beleza e cuidados pessoais', 'cosmetic', 'rose', 'desire'),
  ('expense', 'Salão de beleza e barbearia', 'Beleza e cuidados pessoais', 'scissors', 'rose', 'desire'),
  ('expense', 'Estética e procedimentos', 'Beleza e cuidados pessoais', 'cosmetic', 'rose', 'desire'),
  ('expense', 'Higiene pessoal', 'Beleza e cuidados pessoais', 'waterdrop', 'rose', 'desire'),
  ('expense', 'Saúde e bem-estar', null, 'heart-pulse', 'emerald', 'essential'),
  ('expense', 'Saúde', 'Saúde e bem-estar', 'heart-pulse', 'emerald', 'essential'),
  ('expense', 'Academia e centros de lazer', 'Saúde e bem-estar', 'dumbbell', 'emerald', 'essential'),
  ('expense', 'Prática de esportes', 'Saúde e bem-estar', 'football', 'emerald', 'essential'),
  ('expense', 'Bem-estar', 'Saúde e bem-estar', 'hand-heart', 'emerald', 'essential'),
  ('expense', 'Dentista', 'Saúde e bem-estar', 'stethoscope', 'emerald', 'essential'),
  ('expense', 'Farmácia', 'Saúde e bem-estar', 'pill', 'emerald', 'essential'),
  ('expense', 'Ótica', 'Saúde e bem-estar', 'heart-pulse', 'emerald', 'essential'),
  ('expense', 'Hospitais, clínicas e laboratórios', 'Saúde e bem-estar', 'stethoscope', 'emerald', 'essential'),
  ('expense', 'Serviços digitais', null, 'tv', 'purple', 'desire'),
  ('expense', 'Jogos e videogames', 'Serviços digitais', 'gamepad-2', 'purple', 'desire'),
  ('expense', 'Streaming de vídeo', 'Serviços digitais', 'tv', 'purple', 'desire'),
  ('expense', 'Streaming de música', 'Serviços digitais', 'music', 'purple', 'desire'),
  ('expense', 'Transporte', null, 'car', 'amber', 'essential'),
  ('expense', 'Táxi e transporte privado urbano', 'Transporte', 'car', 'amber', 'essential'),
  ('expense', 'Transporte público', 'Transporte', 'bus', 'amber', 'essential'),
  ('expense', 'Aluguel de veículos', 'Transporte', 'car', 'amber', 'essential'),
  ('expense', 'Aluguel de bicicletas', 'Transporte', 'bicycle', 'amber', 'essential'),
  ('expense', 'Serviços automotivos', 'Transporte', 'car', 'amber', 'essential'),
  ('expense', 'Postos de gasolina', 'Transporte', 'fuel', 'amber', 'essential'),
  ('expense', 'Estacionamentos', 'Transporte', 'car', 'amber', 'essential'),
  ('expense', 'Pedágios e pagamentos no veículo', 'Transporte', 'car', 'amber', 'essential'),
  ('expense', 'Taxas e impostos sobre veículos', 'Transporte', 'bill', 'amber', 'essential'),
  ('expense', 'Manutenção de veículos', 'Transporte', 'car', 'amber', 'essential'),
  ('expense', 'Multas de trânsito', 'Transporte', 'document', 'amber', 'essential'),
  ('expense', 'Moradia', null, 'home', 'indigo', 'essential'),
  ('expense', 'Aluguel', 'Moradia', 'key', 'indigo', 'essential'),
  ('expense', 'Serviços de utilidade pública', 'Moradia', 'lightbulb', 'indigo', 'essential'),
  ('expense', 'Água', 'Moradia', 'waterdrop', 'indigo', 'essential'),
  ('expense', 'Eletricidade', 'Moradia', 'lightbulb', 'indigo', 'essential'),
  ('expense', 'Gás', 'Moradia', 'fuel', 'indigo', 'essential'),
  ('expense', 'Utensílios para casa', 'Moradia', 'sofa', 'indigo', 'essential'),
  ('expense', 'Impostos sobre moradia', 'Moradia', 'bill', 'indigo', 'essential'),
  ('expense', 'Telecomunicação', 'Moradia', 'wifi', 'indigo', 'essential'),
  ('expense', 'Internet', 'Moradia', 'wifi', 'indigo', 'essential'),
  ('expense', 'Celular', 'Moradia', 'smartphone', 'indigo', 'essential'),
  ('expense', 'TV', 'Moradia', 'tv', 'indigo', 'essential'),
  ('expense', 'Lazer e entretenimento', null, 'ticket', 'blue', 'desire'),
  ('expense', 'Lazer', 'Lazer e entretenimento', 'ticket', 'blue', 'desire'),
  ('expense', 'Viagens', 'Lazer e entretenimento', 'plane', 'blue', 'desire'),
  ('expense', 'Aeroportos e cias. aéreas', 'Lazer e entretenimento', 'plane', 'blue', 'desire'),
  ('expense', 'Hospedagem', 'Lazer e entretenimento', 'building', 'blue', 'desire'),
  ('expense', 'Programas de milhagem', 'Lazer e entretenimento', 'plane', 'blue', 'desire'),
  ('expense', 'Passagem de ônibus', 'Lazer e entretenimento', 'bus', 'blue', 'desire'),
  ('expense', 'Bilhetes', 'Lazer e entretenimento', 'ticket', 'blue', 'desire'),
  ('expense', 'Estádios e arenas', 'Lazer e entretenimento', 'football', 'blue', 'desire'),
  ('expense', 'Museus e pontos turísticos', 'Lazer e entretenimento', 'palette', 'blue', 'desire'),
  ('expense', 'Cinema, Teatro e Concertos', 'Lazer e entretenimento', 'ticket', 'blue', 'desire'),
  ('expense', 'Finanças', null, 'banknote', 'green', 'essential'),
  ('expense', 'Pensão', 'Finanças', 'users', 'green', 'essential'),
  ('expense', 'Parcelamento de fatura', 'Finanças', 'credit-card', 'green', 'essential'),
  ('expense', 'Empréstimos e financiamento', 'Finanças', 'hand-money', 'green', 'essential'),
  ('expense', 'Atraso no pagamento e custos de cheque especial', 'Finanças', 'bill', 'green', 'essential'),
  ('expense', 'Juros cobrados', 'Finanças', 'bill', 'green', 'essential'),
  ('expense', 'Financiamento', 'Finanças', 'hand-money', 'green', 'essential'),
  ('expense', 'Financiamento imobiliário', 'Finanças', 'home', 'green', 'essential'),
  ('expense', 'Financiamento de veículos', 'Finanças', 'car', 'green', 'essential'),
  ('expense', 'Empréstimo estudantil', 'Finanças', 'book', 'green', 'essential'),
  ('expense', 'Empréstimos', 'Finanças', 'hand-money', 'green', 'essential'),
  ('expense', 'Obrigações legais', 'Finanças', 'document', 'green', 'essential'),
  ('expense', 'Saldo bloqueado', 'Finanças', 'safe', 'green', 'essential'),
  ('expense', 'Pensão alimentícia', 'Finanças', 'users', 'green', 'essential'),
  ('expense', 'Educação', null, 'book', 'cyan', 'essential'),
  ('expense', 'Cursos online', 'Educação', 'laptop', 'cyan', 'essential'),
  ('expense', 'Universidade', 'Educação', 'building', 'cyan', 'essential'),
  ('expense', 'Escola', 'Educação', 'book', 'cyan', 'essential'),
  ('expense', 'Creche', 'Educação', 'users', 'cyan', 'essential'),
  ('expense', 'Impostos e taxas', null, 'bill', 'yellow', 'essential'),
  ('expense', 'Impostos', 'Impostos e taxas', 'bill', 'yellow', 'essential'),
  ('expense', 'Imposto de renda', 'Impostos e taxas', 'bill', 'yellow', 'essential'),
  ('expense', 'Imposto sobre investimentos', 'Impostos e taxas', 'trending-up', 'yellow', 'essential'),
  ('expense', 'Impostos sobre operações financeiras', 'Impostos e taxas', 'bill', 'yellow', 'essential'),
  ('expense', 'Taxas bancárias', 'Impostos e taxas', 'building', 'yellow', 'essential'),
  ('expense', 'Taxas de conta corrente', 'Impostos e taxas', 'building', 'yellow', 'essential'),
  ('expense', 'Taxas sobre transferências e caixa eletrônico', 'Impostos e taxas', 'card-transfer', 'yellow', 'essential'),
  ('expense', 'Taxas de cartão de crédito', 'Impostos e taxas', 'credit-card', 'yellow', 'essential'),
  ('expense', 'Seguros', null, 'shield', 'sky', 'essential'),
  ('expense', 'Seguro de vida', 'Seguros', 'hand-heart', 'sky', 'essential'),
  ('expense', 'Seguro residencial', 'Seguros', 'home', 'sky', 'essential'),
  ('expense', 'Seguro saúde', 'Seguros', 'heart-pulse', 'sky', 'essential'),
  ('expense', 'Seguro de veículos', 'Seguros', 'car', 'sky', 'essential'),
  ('expense', 'Apostas e jogos', null, 'gamepad-2', 'red', 'desire'),
  ('expense', 'Apostas', 'Apostas e jogos', 'gamepad-2', 'red', 'desire'),
  ('expense', 'Loteria', 'Apostas e jogos', 'ticket', 'red', 'desire'),
  ('expense', 'Apostas online', 'Apostas e jogos', 'globe', 'red', 'desire'),
  ('expense', 'Doações', null, 'hand-heart', 'violet', 'desire'),
  ('expense', 'Outros', null, 'ellipsis', 'gray', 'desire'),
  ('expense', 'Serviços', 'Outros', 'tag', 'gray', 'desire'),
  ('expense', 'Estorno', 'Outros', 'undo', 'gray', 'desire'),
  ('income', 'Renda', null, 'briefcase', 'teal', null),
  ('income', 'Salário', 'Renda', 'briefcase', 'teal', null),
  ('income', 'Aposentadoria', 'Renda', 'piggy-bank', 'teal', null),
  ('income', 'Atividades de empreendedorismo', 'Renda', 'briefcase', 'teal', null),
  ('income', 'Auxílio do governo', 'Renda', 'building', 'teal', null),
  ('income', 'Renda não-recorrente', 'Renda', 'plus-circle', 'teal', null),
  ('income', 'Reembolso', 'Renda', 'undo', 'teal', null);

create temp table old_to_new (type text, old_name text, new_name text) on commit drop;
insert into old_to_new values
  ('expense', 'Alimentação', 'Alimentação'),
  ('expense', 'Transporte', 'Transporte'),
  ('expense', 'Saúde', 'Saúde e bem-estar'),
  ('expense', 'Assinaturas', 'Serviços digitais'),
  ('expense', 'Lazer', 'Lazer e entretenimento'),
  ('expense', 'Moradia', 'Moradia'),
  ('expense', 'Educação', 'Educação'),
  ('expense', 'Tecnologia e equipamentos', 'Eletrônicos'),
  ('expense', 'Vestuário e beleza', 'Vestuário'),
  ('expense', 'Vestuário', 'Vestuário'),
  ('expense', 'Pet', 'Pet Shops e veterinários'),
  ('expense', 'Presentes', 'Compras'),
  ('expense', 'Dívidas e parcelamentos', 'Empréstimos e financiamento'),
  ('expense', 'Empréstimo', 'Empréstimos'),
  ('expense', 'Outros', 'Outros'),
  ('income', 'Salário', 'Salário'),
  ('income', 'Freelance', 'Atividades de empreendedorismo'),
  ('income', 'Investimentos', 'Renda'),
  ('income', 'Reembolso', 'Reembolso'),
  ('income', 'Presente', 'Renda não-recorrente'),
  ('income', 'Outros', 'Renda');

-- 2. estrutura: sem dono, com principal
alter table public.categories add column parent_id uuid references public.categories(id) on delete cascade;

drop policy "categories read" on public.categories;
drop policy "categories insert" on public.categories;
drop policy "categories update" on public.categories;
drop policy "categories delete unused" on public.categories;

alter table public.categories drop constraint categories_user_id_type_name_key;
alter table public.categories alter column user_id drop not null, alter column user_id drop default;

-- 3. categorias universais (user_id nulo): principais, depois subcategorias
insert into public.categories (user_id, type, name, icon, color, class, sort_order, active)
select null, n.type, n.name, n.icon, n.color, n.class, 0, true from new_cat n where n.parent is null;

insert into public.categories (user_id, type, name, icon, color, class, sort_order, active, parent_id)
select null, n.type, n.name, n.icon, n.color, n.class, 0, true, p.id
from new_cat n
join public.categories p on p.user_id is null and p.parent_id is null and p.type = n.type and p.name = n.parent
where n.parent is not null;

-- 4. de/para: categoria antiga de cada pessoa -> universal (sem nome conhecido vai para Outros / Renda)
create temp table cat_map on commit drop as
select o.id as old_id,
       u.id as new_id,
       coalesce(u.parent_id, u.id) as root_id,
       o.user_id
from public.categories o
join public.categories u on u.user_id is null and u.type = o.type
  and u.name = coalesce(
    (select m.new_name from old_to_new m where m.type = o.type and m.old_name = o.name),
    case o.type when 'expense' then 'Outros' else 'Renda' end)
where o.user_id is not null;

-- os gatilhos de lançamento (fechamento, Pix, notificações) não precisam rodar para uma troca de categoria
alter table public.transactions disable trigger user;
update public.transactions t set category_id = m.new_id from cat_map m where t.category_id = m.old_id;
alter table public.transactions enable trigger user;

update public.bills b set category_id = m.new_id from cat_map m where b.category_id = m.old_id;

-- metas: na principal, somando quando duas antigas caem na mesma
alter table public.category_goals drop constraint category_goals_category_id_effective_from_key;
insert into public.category_goals (user_id, category_id, goal_amount, effective_from)
select g.user_id, m.root_id, sum(g.goal_amount), g.effective_from
from public.category_goals g join cat_map m on m.old_id = g.category_id
group by g.user_id, m.root_id, g.effective_from;
delete from public.category_goals g using cat_map m where g.category_id = m.old_id;
alter table public.category_goals add constraint category_goals_user_category_from_key unique (user_id, category_id, effective_from);

-- 5. apaga as antigas e tira o dono da tabela
delete from public.categories where user_id is not null;
alter table public.categories drop column user_id;
alter table public.categories add constraint categories_type_name_key unique (type, name);
alter table public.categories add constraint categories_not_self_parent check (parent_id is null or parent_id <> id);
create index categories_parent_idx on public.categories (parent_id);

-- um nível só e mesmo tipo da principal
create or replace function private.check_category_parent() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.parent_id is not null and not exists (
    select 1 from public.categories p where p.id = new.parent_id and p.parent_id is null and p.type = new.type
  ) then
    raise exception 'Subcategoria precisa de uma principal do mesmo tipo.';
  end if;
  return new;
end $$;
create trigger categories_check_parent before insert or update on public.categories
  for each row execute function private.check_category_parent();

-- leitura para todos; escrita só pelo banco (sem política de insert, update ou delete)
create policy "categories read" on public.categories for select to authenticated using (true);

-- 6. funções que procuravam a categoria da pessoa
create or replace function public.member_categories(p_user uuid)
returns setof public.categories
language sql stable security definer set search_path = '' as $$
  select c.* from public.categories c
  where c.active and (p_user = auth.uid() or private.same_family(p_user, auth.uid()))
  order by c.name
$$;

-- gasto por categoria do mês: soma as subcategorias na principal
create or replace function public.category_spending(p_month date)
returns table(category_id uuid, name text, class text, total bigint, transactions integer, goal bigint)
language sql stable set search_path = '' as $$
  select c.id, c.name, c.class,
         coalesce(sum(t.amount), 0)::bigint,
         count(t.id)::int,
         (select g.goal_amount from public.category_goals g
          where g.category_id = c.id and g.user_id = (select auth.uid())
            and g.effective_from <= private.month_start(p_month)
          order by g.effective_from desc limit 1)
  from public.categories c
  left join public.categories s on s.id = c.id or s.parent_id = c.id
  left join public.transactions t
    on t.category_id = s.id and t.type = 'expense' and t.status = 'confirmed'
   and t.assigned_to = (select auth.uid())
   and t.date >= private.month_start(p_month)
   and t.date < (private.month_start(p_month) + interval '1 month')::date
  where c.type = 'expense' and c.parent_id is null
  group by c.id, c.name, c.class
  order by 4 desc, c.name
$$;

CREATE OR REPLACE FUNCTION public.confirm_settlement(p_settlement uuid, p_to_wallet uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  s public.settlements;
  v_tx uuid;
  v_name text;
begin
  select * into s from public.settlements where id = p_settlement;
  if s.id is null or s.holder_id is distinct from v_uid then raise exception 'Acerto não encontrado.'; end if;
  if s.status <> 'reported' then raise exception 'Este acerto já foi tratado.'; end if;
  if private.wallet_owner(p_to_wallet) is distinct from v_uid or private.wallet_is_credit(p_to_wallet) then
    raise exception 'Escolha uma carteira sua para receber.';
  end if;

  select name into v_name from public.profiles where id = s.debtor_id;
  insert into public.transactions (type, amount, date, wallet_id, category_id, description, created_by, assigned_to)
  values ('income', s.amount, coalesce(s.paid_on, private.today_br()), p_to_wallet,
          (select id from public.categories where type = 'income' and name = 'Reembolso' limit 1),
          'Acerto de ' || coalesce(v_name, 'membro'), v_uid, v_uid)
  returning id into v_tx;

  update public.settlements set status = 'confirmed', confirmed_at = now(), holder_transaction_id = v_tx where id = s.id;

  insert into public.notification_queue (user_id, kind, title, body, url)
  values (s.debtor_id, 'family_events', 'Pagamento confirmado',
          'Seu acerto de ' || private.brl(s.amount) || ' foi confirmado.',
          coalesce('/cards/' || s.wallet_id, '/cards/pessoa/' || s.holder_id));
end $function$;

CREATE OR REPLACE FUNCTION public.receive_shared_settlement(p_shared uuid, p_debtor uuid, p_amount bigint, p_to_wallet uuid, p_date date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  sp public.shared_payments;
  v_part bigint;
  v_done bigint;
  v_tx uuid;
  v_id uuid;
  v_name text;
  v_paid date := coalesce(p_date, private.today_br());
begin
  select * into sp from public.shared_payments where id = p_shared;
  if sp.id is null or sp.payer_id is distinct from v_uid then raise exception 'Pix não encontrado.'; end if;
  if not coalesce((select is_guest from public.profiles where id = p_debtor), false) then
    raise exception 'Quem tem o app informa o acerto.';
  end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Informe o valor.'; end if;
  if v_paid > private.today_br() then raise exception 'A data do pagamento não pode ser no futuro.'; end if;
  if private.wallet_owner(p_to_wallet) is distinct from v_uid or private.wallet_is_credit(p_to_wallet) then
    raise exception 'Escolha uma carteira sua para receber.';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_shared::text || p_debtor::text));
  select coalesce(sum(amount), 0) into v_part from public.transactions
   where shared_payment_id = p_shared and assigned_to = p_debtor and type = 'expense' and status = 'confirmed';
  select coalesce(sum(amount), 0) into v_done from public.settlements
   where shared_payment_id = p_shared and debtor_id = p_debtor and status in ('confirmed', 'reported');
  if p_amount > v_part - v_done then
    if v_part - v_done <= 0 then raise exception 'Esta parte já foi toda acertada.'; end if;
    raise exception 'Falta receber só %.', private.brl(v_part - v_done);
  end if;

  select name into v_name from public.profiles where id = p_debtor;
  insert into public.transactions (type, amount, date, wallet_id, category_id, description, created_by, assigned_to)
  values ('income', p_amount, v_paid, p_to_wallet,
          (select id from public.categories where type = 'income' and name = 'Reembolso' limit 1),
          'Acerto de ' || coalesce(v_name, 'membro'), v_uid, v_uid)
  returning id into v_tx;

  insert into public.settlements (wallet_id, debtor_id, holder_id, invoice_ref, shared_payment_id, amount, status,
                                  reported_at, confirmed_at, holder_transaction_id, paid_on)
  values (null, p_debtor, v_uid, null, p_shared, p_amount, 'confirmed', now(), now(), v_tx, v_paid)
  returning id into v_id;
  return v_id;
end $function$;

CREATE OR REPLACE FUNCTION public.create_shared_payment(p_payer uuid, p_wallet uuid, p_amount bigint, p_date date, p_place text, p_category uuid, p_parts jsonb, p_source text DEFAULT 'manual'::text, p_source_data jsonb DEFAULT NULL::jsonb, p_receipt_path text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_part jsonb;
  v_user uuid;
  v_share bigint;
  v_sum bigint := 0;
  v_count integer := 0;
  v_only uuid;
  v_name text;
  v_payer_name text;
  v_place text := nullif(trim(p_place), '');
  v_parts jsonb;
begin
  if v_uid is null then raise exception 'Não autenticado'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Informe o valor.'; end if;
  if p_payer is null or (p_payer <> v_uid and not private.same_family(p_payer, v_uid)) then
    raise exception 'Quem pagou precisa ser você ou alguém da sua família.';
  end if;
  if p_payer = v_uid and (p_wallet is null or private.wallet_owner(p_wallet) is distinct from v_uid
                          or private.wallet_is_credit(p_wallet)) then
    raise exception 'Escolha a carteira do Pix.';
  end if;
  if p_category is not null and not exists (select 1 from public.categories where id = p_category and active) then
    raise exception 'Categoria inválida.';
  end if;

  for v_part in select * from jsonb_array_elements(coalesce(p_parts, '[]'::jsonb)) loop
    v_user := (v_part->>'user_id')::uuid;
    v_share := (v_part->>'amount')::bigint;
    if v_share is null or v_share < 0 then raise exception 'Parte com valor inválido.'; end if;
    if v_user <> v_uid and not private.same_family(v_user, v_uid) then
      raise exception 'Só dá para dividir com pessoas da sua família.';
    end if;
    if v_share > 0 then v_count := v_count + 1; v_only := v_user; end if;
    v_sum := v_sum + v_share;
  end loop;
  if v_sum <> p_amount then raise exception 'As partes precisam somar o valor do Pix.'; end if;
  if v_count = 0 or (v_count = 1 and v_only = p_payer) then
    raise exception 'Escolha quem divide o Pix.';
  end if;
  if (select count(distinct x->>'user_id') from jsonb_array_elements(p_parts) x) <> jsonb_array_length(p_parts) then
    raise exception 'Pessoa repetida na divisão.';
  end if;

  select jsonb_agg(jsonb_build_object('user_id', x->>'user_id', 'amount', (x->>'amount')::bigint))
    into v_parts from jsonb_array_elements(p_parts) x where (x->>'amount')::bigint > 0;

  insert into public.shared_payments (payer_id, created_by, amount, date, place)
  values (p_payer, v_uid, p_amount, p_date, v_place)
  returning id into v_id;

  select name into v_name from public.profiles where id = v_uid;
  select name into v_payer_name from public.profiles where id = p_payer;

  for v_part in select * from jsonb_array_elements(p_parts) loop
    v_user := (v_part->>'user_id')::uuid;
    v_share := (v_part->>'amount')::bigint;
    continue when v_share = 0;
    insert into public.transactions (type, amount, date, wallet_id, category_id, place, created_by, assigned_to,
      paid_by, shared_payment_id, source, source_data, receipt_path)
    values ('expense', v_share, p_date,
      case when v_user = p_payer and p_payer = v_uid then p_wallet end,
      case when v_user = v_uid then p_category end,
      v_place, v_uid, v_user, p_payer, v_id, coalesce(p_source, 'manual'),
      coalesce(p_source_data, '{}'::jsonb) || jsonb_build_object('shared_total', p_amount, 'shared_parts', v_parts),
      case when v_user = v_uid then p_receipt_path end);

    if v_user <> v_uid and v_user <> p_payer then
      insert into public.notification_queue (user_id, kind, title, body, url)
      values (v_user, 'family_events', 'Pix dividido',
              'Sua parte: ' || private.brl(v_share) || coalesce(' em ' || v_place, '') || '. Quem pagou: '
                || case when p_payer = v_uid then coalesce(v_name, 'alguém') else coalesce(v_payer_name, 'alguém') end || '.',
              '/cards/pessoa/' || p_payer);
    end if;
  end loop;

  if p_payer <> v_uid then
    insert into public.notification_queue (user_id, kind, title, body, url)
    values (p_payer, 'family_events', 'Pix dividido',
            coalesce(v_name, 'Alguém') || ' registrou que você pagou ' || private.brl(p_amount)
              || coalesce(' em ' || v_place, '') || ', dividido entre a família.',
            '/cards');
  end if;
  return v_id;
end $function$;

CREATE OR REPLACE FUNCTION private.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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

  insert into public.notification_settings (user_id, type, enabled, time, days_before) values
    (new.id, 'bill_due',       true, '09:00', 2),
    (new.id, 'log_reminder',   true, '21:00', null),
    (new.id, 'weekly_summary', true, '20:00', null),
    (new.id, 'smart_alerts',   true, null,    null),
    (new.id, 'family_events',  true, null,    null);
  return new;
end $function$;
