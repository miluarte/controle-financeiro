-- Pessoa sem o app na família: alguém que usa o cartão de um titular mas não tem conta no Troco.
-- Vira um usuário "convidado" (não consegue entrar: e-mail interno e senha aleatória), membro
-- ativo da família. Assim recebe compras ("De quem é essa compra?"), entra na divisão da fatura
-- e o titular exporta o que ela deve em PDF.
alter table public.profiles add column is_guest boolean not null default false;

create function public.add_family_guest(p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_family uuid;
  v_guest uuid := gen_random_uuid();
  v_name text := nullif(trim(p_name), '');
begin
  if v_name is null then raise exception 'Informe o nome.'; end if;
  select family_id into v_family from public.family_members where user_id = v_uid and status = 'active';
  if v_family is null then raise exception 'Você não está numa família.'; end if;

  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token,
    email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', v_guest, 'authenticated', 'authenticated',
    'convidado-' || v_guest || '@sem-app.troco', extensions.crypt(encode(extensions.gen_random_bytes(24), 'hex'), extensions.gen_salt('bf')),
    now(), '{"provider":"guest","providers":[]}', jsonb_build_object('name', v_name), now(), now(), '', '', '', '');

  update public.profiles set is_guest = true, onboarding_completed_at = now(), name = v_name where id = v_guest;
  insert into public.family_members (family_id, user_id, role, status, joined_at)
  values (v_family, v_guest, 'member', 'active', now());
  return v_guest;
end $$;
revoke execute on function public.add_family_guest(text) from public, anon;
grant execute on function public.add_family_guest(text) to authenticated;

drop function public.family_members_list();
create function public.family_members_list()
returns table(user_id uuid, name text, avatar_color text, role text, status text, joined_at timestamptz, is_guest boolean)
language sql stable security definer set search_path = '' as $$
  select m.user_id, p.name, p.avatar_color, m.role, m.status, m.joined_at, p.is_guest
  from public.family_members m
  join public.profiles p on p.id = m.user_id
  where m.family_id = (select family_id from public.family_members where user_id = (select auth.uid()))
    and (m.status = 'active' or private.is_family_admin(m.family_id) or m.user_id = (select auth.uid()))
  order by m.joined_at nulls last, m.created_at
$$;
revoke execute on function public.family_members_list() from public, anon;
grant execute on function public.family_members_list() to authenticated;
