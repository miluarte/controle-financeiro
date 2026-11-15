-- Tira da API pública (PostgREST só publica o schema public) as funções internas:
-- auxiliares das políticas de acesso e funções de gatilho. Elas vão para o schema private.
-- Políticas e gatilhos apontam para a função pelo identificador interno, então continuam valendo;
-- os corpos de função que chamam "public.<auxiliar>(" são reescritos para "private.<auxiliar>(".

grant usage on schema private to authenticated, service_role;
revoke all on private.app_secrets from public, anon, authenticated;

do $$
declare
  helpers text[] := array[
    'month_start(date)', 'clamp_day(date, integer)', 'today_br()', 'brl(bigint)',
    'my_family_id()', 'same_family(uuid, uuid)', 'is_family_admin(uuid)',
    'wallet_owner(uuid)', 'wallet_is_credit(uuid)', 'has_wallet_access(uuid, uuid)',
    'invoice_ref_for(uuid, date)', 'invoice_closing_date(uuid, date)', 'invoice_due_date(uuid, date)', 'invoice_is_paid(uuid, date)',
    'generate_family_code()', 'set_updated_at()',
    'handle_new_user()', 'transactions_before_write()', 'wallets_before_delete()', 'family_members_after_delete()',
    'notify_card_purchase()', 'notify_assignment()', 'dispatch_notifications()'
  ];
  names text[];
  h text;
  f record;
  def text;
  n text;
begin
  select array_agg(split_part(x, '(', 1)) into names from unnest(helpers) x;

  foreach h in array helpers loop
    execute format('alter function public.%s set schema private', h);
  end loop;

  -- reescreve as referências nos corpos (public e private)
  for f in
    select p.oid from pg_proc p join pg_namespace s on s.oid = p.pronamespace
    where s.nspname in ('public', 'private') and p.prokind = 'f'
  loop
    def := pg_get_functiondef(f.oid);
    if def ~ ('public\.(' || array_to_string(names, '|') || ')\(') then
      foreach n in array names loop
        def := replace(def, 'public.' || n || '(', 'private.' || n || '(');
      end loop;
      execute def;
    end if;
  end loop;

  -- auxiliares usados nas políticas precisam de execute para quem consulta; nada para anon
  foreach h in array helpers loop
    execute format('revoke execute on function private.%s from public, anon', h);
  end loop;
  foreach h in array array[
    'month_start(date)', 'clamp_day(date, integer)', 'today_br()', 'brl(bigint)',
    'my_family_id()', 'same_family(uuid, uuid)', 'is_family_admin(uuid)',
    'wallet_owner(uuid)', 'wallet_is_credit(uuid)', 'has_wallet_access(uuid, uuid)',
    'invoice_ref_for(uuid, date)', 'invoice_closing_date(uuid, date)', 'invoice_due_date(uuid, date)', 'invoice_is_paid(uuid, date)'
  ] loop
    execute format('grant execute on function private.%s to authenticated, service_role', h);
  end loop;
end $$;

-- tarefa agendada usava public.today_br()
select cron.alter_job(
  (select jobid from cron.job where jobname = 'troco-bill-occurrences'),
  command := $$select public.ensure_bill_occurrences(private.today_br());
    select public.ensure_bill_occurrences((private.today_br() + interval '1 month')::date);$$
);
