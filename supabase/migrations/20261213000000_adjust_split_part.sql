-- Ajustar o valor de uma pessoa numa parcela de compra dividida (ex.: um centavo errado).
-- Recalcula split_total da parcela, split_parts (total por pessoa) e split_schedule em todas as partes,
-- e o total da compra parcelada da pessoa.
create or replace function public.adjust_split_part(p_transaction uuid, p_amount bigint)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_uid uuid := auth.uid();
  t public.transactions;
  v_root uuid;
  v_origs uuid[];
  v_sched jsonb;
  v_parts jsonb;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Informe um valor maior que zero.';
  end if;
  select * into t from public.transactions where id = p_transaction;
  if t.id is null then
    raise exception 'Compra não encontrada.';
  end if;
  v_root := coalesce((t.source_data->>'split_of')::uuid, t.id);
  if not exists (select 1 from public.transactions o where o.id = v_root and o.source_data ? 'split_total') then
    raise exception 'Esta compra não está dividida.';
  end if;
  if private.wallet_owner(t.wallet_id) is distinct from v_uid
     and not exists (select 1 from public.transactions o where o.id = v_root and o.created_by = v_uid) then
    raise exception 'Só o titular do cartão ou quem dividiu a compra pode ajustar.';
  end if;
  if t.invoice_ref is not null and private.invoice_is_paid(t.wallet_id, t.invoice_ref) then
    raise exception 'Fatura já quitada. Não dá para mudar o valor.';
  end if;
  if p_amount = t.amount then
    return;
  end if;

  update public.transactions set amount = p_amount where id = t.id;
  if t.installment_group_id is not null then
    update public.installment_groups set total_amount = total_amount + (p_amount - t.amount)
      where id = t.installment_group_id;
  end if;

  -- parcelas originais da compra (a parte de quem dividiu)
  select array_agg(o.id) into v_origs
  from public.transactions r join public.transactions o
    on o.id = r.id or (r.installment_group_id is not null and o.installment_group_id = r.installment_group_id)
  where r.id = v_root and o.source_data ? 'split_total' and not o.source_data ? 'split_of';

  -- total da parcela ajustada, em todas as partes dela
  update public.transactions x set source_data = x.source_data || jsonb_build_object('split_total',
      (select sum(y.amount) from public.transactions y where y.id = v_root or (y.source_data->>'split_of')::uuid = v_root))
    where x.id = v_root or (x.source_data->>'split_of')::uuid = v_root;

  -- total por pessoa e divisão mês a mês, iguais em todas as partes da compra
  with x as (
    select * from public.transactions
    where id = any(v_origs) or (source_data->>'split_of')::uuid = any(v_origs)
  ), m as (
    select installment_n, min(date) as date,
           jsonb_agg(jsonb_build_object('user_id', assigned_to, 'amount', amount) order by assigned_to) as parts
    from x group by installment_n
  )
  select jsonb_agg(jsonb_build_object('n', installment_n, 'date', date, 'parts', parts) order by installment_n nulls first)
    into v_sched from m;
  select jsonb_agg(jsonb_build_object('user_id', u, 'amount', a) order by u) into v_parts
  from (select assigned_to u, sum(amount) a from public.transactions
        where id = any(v_origs) or (source_data->>'split_of')::uuid = any(v_origs) group by assigned_to) s;
  update public.transactions set source_data = source_data
      || jsonb_build_object('split_schedule', v_sched, 'split_parts', v_parts)
    where id = any(v_origs) or (source_data->>'split_of')::uuid = any(v_origs);
end $$;

revoke execute on function public.adjust_split_part(uuid, bigint) from public, anon;
grant execute on function public.adjust_split_part(uuid, bigint) to authenticated;
