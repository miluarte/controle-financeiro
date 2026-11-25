-- Edição de compra pelo formulário único (Novo gasto): a compra inteira é
-- todas as parcelas da compra original e as partes de cada pessoa (split_of).

-- ids de todas as linhas da compra de um lançamento
create or replace function private.purchase_ids(p_transaction uuid)
returns uuid[]
language sql
stable
set search_path to ''
as $$
  with t as (select * from public.transactions where id = p_transaction),
  root as (
    select r.* from public.transactions r, t
    where r.id = coalesce((t.source_data->>'split_of')::uuid, t.id)
  ),
  origs as (
    select o.id from public.transactions o, root
    where o.id = root.id or (root.installment_group_id is not null and o.installment_group_id = root.installment_group_id)
  )
  select coalesce(array_agg(distinct x.id), '{}') from public.transactions x
  where x.id in (select id from origs) or (x.source_data->>'split_of')::uuid in (select id from origs)
$$;

-- dados da compra inteira para abrir o formulário: total, parcelas, data da compra e parcela atual
create or replace function public.purchase_info(p_transaction uuid)
returns jsonb
language sql
stable
set search_path to ''
as $$
  with ids as (select unnest(private.purchase_ids(p_transaction)) id),
  x as (select t.* from public.transactions t join ids using (id)),
  g as (select distinct installment_group_id id from x where installment_group_id is not null)
  select jsonb_build_object(
    'rows', (select count(*) from x),
    'total', coalesce((select sum(ig.total_amount) from public.installment_groups ig join g using (id)), (select sum(amount) from x)),
    'installments', (select max(installments_total) from x),
    'first_date', (select min(ig.first_date) from public.installment_groups ig join g using (id)),
    'start', (select min(installment_n) from x),
    'owners', (select jsonb_agg(distinct assigned_to) from x)
  )
$$;

-- muda local, categoria (de quem é dono do lançamento) e itens em todas as linhas da compra
create or replace function public.update_purchase_info(p_transaction uuid, p_place text, p_category uuid, p_items jsonb)
returns void
language plpgsql
set search_path to ''
as $$
declare
  v_ids uuid[] := private.purchase_ids(p_transaction);
  v_owner uuid := (select assigned_to from public.transactions where id = p_transaction);
begin
  update public.transactions set place = p_place,
    source_data = case when p_items is null then source_data
                       else coalesce(source_data, '{}'::jsonb) || jsonb_build_object('items', p_items) end
    where id = any(v_ids);
  update public.transactions set category_id = p_category
    where id = any(v_ids) and assigned_to = v_owner;
end $$;

-- exclui a compra inteira (todas as parcelas e as partes de cada pessoa)
create or replace function public.delete_purchase(p_transaction uuid)
returns integer
language plpgsql
set search_path to ''
as $$
declare
  v_ids uuid[] := private.purchase_ids(p_transaction);
  v_groups uuid[];
  n integer;
begin
  select array_agg(distinct installment_group_id) into v_groups
    from public.transactions where id = any(v_ids) and installment_group_id is not null;
  delete from public.transactions where id = any(v_ids);
  get diagnostics n = row_count;
  delete from public.installment_groups g where g.id = any(coalesce(v_groups, '{}'))
    and not exists (select 1 from public.transactions t where t.installment_group_id = g.id);
  return n;
end $$;

revoke execute on function public.purchase_info(uuid) from public, anon;
revoke execute on function public.update_purchase_info(uuid, text, uuid, jsonb) from public, anon;
revoke execute on function public.delete_purchase(uuid) from public, anon;
grant execute on function public.purchase_info(uuid) to authenticated;
grant execute on function public.update_purchase_info(uuid, text, uuid, jsonb) to authenticated;
grant execute on function public.delete_purchase(uuid) to authenticated;
