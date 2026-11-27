-- Foto de perfil: a pessoa corta em quadrado no app, que reduz e comprime (512 px, WebP ou JPEG)
-- antes de enviar. A imagem fica no bucket "avatars" (pasta = id da pessoa) e o perfil guarda só a URL.
alter table public.profiles add column if not exists avatar_url text;

-- público para leitura: a família vê a foto sem URL assinada; o nome do arquivo não é previsível.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/webp', 'image/jpeg'])
on conflict (id) do nothing;

create policy "avatars own folder read" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars own folder insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars own folder delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- a lista da família passa a trazer a foto
drop function public.family_members_list();
create function public.family_members_list()
returns table(user_id uuid, name text, avatar_color text, role text, status text, joined_at timestamptz, is_guest boolean, avatar_url text)
language sql stable security definer set search_path = '' as $$
  select m.user_id, p.name, p.avatar_color, m.role, m.status, m.joined_at, p.is_guest, p.avatar_url
  from public.family_members m
  join public.profiles p on p.id = m.user_id
  where m.family_id = (select family_id from public.family_members where user_id = (select auth.uid()))
    and (m.status = 'active' or private.is_family_admin(m.family_id) or m.user_id = (select auth.uid()))
  order by m.joined_at nulls last, m.created_at
$$;
revoke execute on function public.family_members_list() from public, anon;
grant execute on function public.family_members_list() to authenticated;
