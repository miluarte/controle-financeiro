-- Cartões compartilhados comigo também trazem o tipo e o final, para o app mostrar "Nubank 0514"
-- e diferenciar cartões do mesmo banco.
drop function if exists public.shared_wallets();

create function public.shared_wallets()
returns table(id uuid, name text, type text, last4 text, finish text, closing_day smallint, due_day smallint,
  owner_id uuid, owner_name text)
language sql stable security definer set search_path = '' as $$
  select w.id, w.name, w.type::text, w.last4, w.finish, w.closing_day, w.due_day, w.owner_id, p.name
  from public.wallets w
  join public.profiles p on p.id = w.owner_id
  where w.owner_id <> (select auth.uid())
    and private.has_wallet_access(w.id, (select auth.uid()))
  order by p.name, w.name
$$;

revoke all on function public.shared_wallets() from public, anon;
grant execute on function public.shared_wallets() to authenticated, service_role;
