-- Categorias de outra pessoa da família, para o titular do cartão escolher a categoria
-- de uma compra que é dela (categorias são de cada um).
create or replace function public.member_categories(p_user uuid)
returns setof public.categories
language sql
stable
security definer
set search_path to ''
as $$
  select c.* from public.categories c
  where c.user_id = p_user and c.active
    and (p_user = auth.uid() or private.same_family(p_user, auth.uid()))
  order by c.sort_order, c.name
$$;

revoke execute on function public.member_categories(uuid) from public, anon;
grant execute on function public.member_categories(uuid) to authenticated;
