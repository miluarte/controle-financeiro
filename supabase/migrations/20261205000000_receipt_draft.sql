-- Foto da nota sempre anexada: ao ler a nota, a foto vai para <usuário>/rascunho.jpg (substituída a cada
-- leitura, sem acumular) e, ao registrar o gasto, é movida para um nome definitivo. Upsert e move precisam
-- de UPDATE na própria pasta.
create policy "receipts own folder update" on storage.objects for update to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);
