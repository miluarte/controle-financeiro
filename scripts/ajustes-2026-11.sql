-- Ajustes da conferência planilha x app (Supabase SQL Editor)
begin;
insert into settlements (wallet_id, debtor_id, holder_id, invoice_ref, amount, status, reported_at, confirmed_at, paid_on)
values ('dd649652-976d-4aa7-81f2-1eaa79bf77aa','52768d32-4a73-4dfc-be7c-ad5d6f73c73f','21e21e9f-4f31-41b7-bbde-5567ac671bb5','2026-11-01',19713,'confirmed',now(),now(),'2026-11-12');
delete from transactions where id='01ad315a-c952-4c76-b4bb-7264f962f76f';
delete from installment_groups g where g.id='9ec73aa3-3f4e-4cd7-a1ba-8ee28e33274d' and not exists (select 1 from transactions t where t.installment_group_id=g.id);
update transactions set source_data = coalesce(source_data,'{}'::jsonb) || '{"items":[{"name":"Presente Ravi","amount":8697}]}'::jsonb where installment_group_id='4bbb5cb5-26af-4366-830f-10766136c308';
insert into settlements (wallet_id, debtor_id, holder_id, invoice_ref, amount, status, reported_at, confirmed_at, paid_on)
select 'dd649652-976d-4aa7-81f2-1eaa79bf77aa','52768d32-4a73-4dfc-be7c-ad5d6f73c73f','21e21e9f-4f31-41b7-bbde-5567ac671bb5', r::date, 2899,'confirmed',now(),now(),'2026-11-24'
from unnest(array['2026-12-01','2027-01-01','2027-02-01']) r;
update transactions set amount=6102 where installment_group_id='d227e890-1470-4254-9c74-dda92e3fde6f';
update installment_groups set total_amount=73224 where id='d227e890-1470-4254-9c74-dda92e3fde6f';
update transactions set source_data = jsonb_set(source_data,'{items,0,amount}','73224') where installment_group_id='d227e890-1470-4254-9c74-dda92e3fde6f';
delete from bill_occurrences where bill_id='a958d41c-a93e-4f54-8e83-0672639b2b58';
delete from bills where id='a958d41c-a93e-4f54-8e83-0672639b2b58';
with w as (insert into wallets (owner_id,name,type,due_day) values ('52768d32-4a73-4dfc-be7c-ad5d6f73c73f','Linha de crédito Shopee','other',6) returning id),
g as (insert into installment_groups (created_by,wallet_id,description,total_amount,installments_total,first_date) select '52768d32-4a73-4dfc-be7c-ad5d6f73c73f',w.id,'Shopee',14372,2,'2026-11-06' from w returning id, wallet_id)
insert into transactions (type,amount,date,category_id,wallet_id,place,created_by,assigned_to,installment_group_id,installment_n,installments_total,source,status,source_data)
select 'expense',7186,d::date,'277547d4-8d27-4d13-886d-9b09576668a6',g.wallet_id,'Shopee','52768d32-4a73-4dfc-be7c-ad5d6f73c73f','52768d32-4a73-4dfc-be7c-ad5d6f73c73f',g.id,n,2,'manual','confirmed','{"items":[{"name":"Presente dia das crianças","amount":14372}],"purchase_date":"2026-10-12"}'::jsonb
from g, (values (1,'2026-11-06'),(2,'2026-12-06')) v(n,d);
commit;
