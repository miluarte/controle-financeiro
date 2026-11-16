-- Categorias padrão de conta nova: a lista da dona do projeto, com ícones e cores sugeridos
-- (novos tokens em lib/constants.ts). Cada pessoa pode mudar depois.
create or replace function private.handle_new_user() returns trigger
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
    (new.id, 'expense', 'Alimentação',               'utensils',      'orange',  'essential', 0),
    (new.id, 'expense', 'Transporte',                'car',           'blue',    'essential', 1),
    (new.id, 'expense', 'Saúde',                     'heart-pulse',   'red',     'essential', 2),
    (new.id, 'expense', 'Assinaturas',               'repeat',        'indigo',  'desire',    3),
    (new.id, 'expense', 'Lazer',                     'gamepad-2',     'pink',    'desire',    4),
    (new.id, 'expense', 'Moradia',                   'home',          'green',   'essential', 5),
    (new.id, 'expense', 'Educação',                  'book',          'purple',  'essential', 6),
    (new.id, 'expense', 'Tecnologia e equipamentos', 'laptop',        'sky',     'desire',    7),
    (new.id, 'expense', 'Vestuário e beleza',        'hanger',        'fuchsia', 'desire',    8),
    (new.id, 'expense', 'Pet',                       'paw',           'amber',   'desire',    9),
    (new.id, 'expense', 'Presentes',                 'gift',          'rose',    'desire',    10),
    (new.id, 'expense', 'Dívidas e parcelamentos',   'card-transfer', 'red',     'essential', 11),
    (new.id, 'expense', 'Outros',                    'ellipsis',      'gray',    'desire',    12),
    (new.id, 'income',  'Salário',       'briefcase',   'green',  null, 0),
    (new.id, 'income',  'Freelance',     'laptop',      'blue',   null, 1),
    (new.id, 'income',  'Investimentos', 'trending-up', 'purple', null, 2),
    (new.id, 'income',  'Reembolso',     'undo',        'teal',   null, 3),
    (new.id, 'income',  'Presente',      'gift',        'pink',   null, 4),
    (new.id, 'income',  'Outros',        'plus-circle', 'gray',   null, 5);

  insert into public.notification_settings (user_id, type, enabled, time, days_before) values
    (new.id, 'bill_due',       true, '09:00', 2),
    (new.id, 'log_reminder',   true, '21:00', null),
    (new.id, 'weekly_summary', true, '20:00', null),
    (new.id, 'smart_alerts',   true, null,    null),
    (new.id, 'family_events',  true, null,    null);
  return new;
end $$;
