'use client'

import { useEffect, useRef, useState } from 'react'
import { DocumentAddLinearIcon } from '@solar-icons/react'
import { Button } from '@/components/ui/button'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { ModalSheet } from '@/components/ios/modal-sheet'
import { SelectField } from '@/components/shared/select-field'
import { useCardPeople } from '@/hooks/use-card-people'
import { useRefresh } from '@/hooks/use-refresh'
import { familyApi } from '@/lib/api/family'
import { walletsApi } from '@/lib/api/wallets'
import { transactionsApi } from '@/lib/api/transactions'
import { openInvoiceRef } from '@/lib/invoice'
import { reconcile, type Reconciliation } from '@/lib/reconcile'
import { installmentFirstDate, parseStatement, pdfLines, type StatementItem } from '@/lib/statement'
import type { OwnWallet } from '@/lib/types'
import { daysInMonth, formatCurrency, formatDate } from '@/lib/utils'
import { LoadingDots } from '@/components/shared/loading-dots'
import { useCategorySuggest } from '@/hooks/use-category-suggest'
import { feedback } from '@/lib/feedback'
import { useConfirmDelete } from '@/components/ios/use-delete-action'
import { Money } from '@/components/shared/money'

// Conferir a fatura com o PDF do banco: o que falta no app, o que sobra e o que bate.
export function ReconcileSheet({ open, onOpenChange, wallet, invoiceRef, dueDate }: {
  open: boolean; onOpenChange: (o: boolean) => void; wallet: OwnWallet; invoiceRef: string; dueDate: string
}) {
  return (
    <ModalSheet open={open} onOpenChange={onOpenChange} title="Conferir fatura">
      {open && <Reconcile wallet={wallet} invoiceRef={invoiceRef} dueDate={dueDate} />}
    </ModalSheet>
  )
}

const label = (i: StatementItem) =>
  `${formatDate(i.date).slice(0, 5)}${i.installmentN ? ` · parcela ${i.installmentN} de ${i.installmentsTotal}` : ''}`

// Pede a senha de PDF protegido (alguns bancos usam parte do CPF).
export const askPdfPassword = (wrong: boolean) =>
  window.prompt(wrong ? 'Senha errada. Digite a senha do PDF:' : 'Este PDF tem senha. Digite a senha:')

export function Reconcile({ wallet, invoiceRef, dueDate, initialFile }: {
  wallet: OwnWallet; invoiceRef: string; dueDate: string; initialFile?: File
}) {
  const refresh = useRefresh()
  const confirmDel = useConfirmDelete()
  const suggest = useCategorySuggest()
  const input = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [bankTotal, setBankTotal] = useState<number | null>(null)
  const [result, setResult] = useState<Reconciliation | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [items, setItems] = useState<StatementItem[]>([])
  // juros do rotativo lidos da fatura e guardados no cartão (para a estimativa de atraso)
  const [rateSaved, setRateSaved] = useState<number | null>(null)
  // cartão compartilhado: de quem é cada compra que falta (padrão: você)
  const shared = wallet.shareScope !== 'none'
  const { me, people, nameOf } = useCardPeople()
  const [owners, setOwners] = useState<Record<string, string>>({})
  const keyOf = (i: StatementItem) => `${i.date}|${i.amount}|${i.description}|${i.installmentN ?? ''}`
  const peopleOptions = people.map(p => ({ value: p.userId, label: p.userId === me ? 'Você' : p.name }))

  async function compare(list: StatementItem[]) {
    const txs = await transactionsApi.getByInvoice(wallet.id, `${invoiceRef}-01`)
    setResult(reconcile(list, txs))
  }

  async function onFile(file: File | undefined) {
    if (!file) return
    setStatus('Lendo o PDF…'); setResult(null)
    try {
      const st = parseStatement(await pdfLines(await file.arrayBuffer(), askPdfPassword), dueDate)
      const list = st.carried
        ? [...st.items, { date: `${invoiceRef}-01`, description: 'Saldo da fatura anterior', amount: st.carried, installmentN: null, installmentsTotal: null }]
        : st.items
      if (!list.length) { setStatus('Nenhuma compra encontrada neste PDF.'); return }
      setItems(list); setBankTotal(st.total)
      if (st.revolvingRate && st.revolvingRate !== wallet.revolvingRate) {
        await walletsApi.update(wallet.id, { revolvingRate: st.revolvingRate })
        setRateSaved(st.revolvingRate); await refresh()
      }
      await compare(list)
      setStatus(null)
    } catch {
      setStatus('Não foi possível ler este PDF.')
    } finally {
      if (input.current) input.current.value = ''
    }
  }

  // vindo da importação: o PDF já foi escolhido
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lê o arquivo escolhido fora daqui (sistema externo)
    if (initialFile) void onFile(initialFile)
  }, [initialFile]) // eslint-disable-line react-hooks/exhaustive-deps

  // data dentro desta fatura: a do banco, ou o dia do fechamento se ela cair em outra fatura
  function dateInInvoice(date: string) {
    if (openInvoiceRef(wallet, date) === invoiceRef) return date
    const day = Math.min(wallet.closingDay ?? 1, daysInMonth(invoiceRef)) - (wallet.closingDayInclusive ? 0 : 1)
    return `${invoiceRef}-${String(Math.max(day, 1)).padStart(2, '0')}`
  }

  async function add(item: StatementItem) {
    const who = owners[keyOf(item)]
    if (item.installmentN && item.installmentsTotal) {
      const group = await transactionsApi.createInstallments({
        walletId: wallet.id, categoryId: suggest(item.description), place: item.description, installments: item.installmentsTotal,
        total: item.amount * item.installmentsTotal, firstDate: installmentFirstDate(item, invoiceRef), start: item.installmentN,
      })
      // assign_purchase já vale para todas as parcelas em aberto da compra
      if (who && who !== me) { const [first] = await transactionsApi.idsOfGroup(group); if (first) await familyApi.assignPurchase(first, who) }
    } else {
      const tx = await transactionsApi.create({
        type: 'expense', amount: item.amount, date: dateInInvoice(item.date), categoryId: suggest(item.description),
        walletId: wallet.id, place: item.description, description: null, source: 'import',
      })
      if (who && who !== me) await familyApi.assignPurchase(tx.id, who)
    }
  }

  // muda o dono de uma compra que já está no app (parcelada: vale para as parcelas em aberto)
  const reassign = (txId: string, who: string) => familyApi.assignPurchase(txId, who)

  async function run(key: string, fn: () => Promise<unknown>, done: string) {
    setBusy(key)
    try { await fn(); await refresh(); await compare(items); feedback.done(done) }
    catch (err) { feedback.error(err instanceof Error ? err.message : 'Não foi possível concluir.') }
    finally { setBusy(null) }
  }

  const appTotal = result ? [...result.matched.map(m => m.tx), ...result.extra].reduce((s, t) => s + t.amount, 0) : 0

  return (
    <div className="space-y-6">
      {confirmDel.sheet}
      {!initialFile && <Button variant="secondary" size="lg" className="w-full gap-2" disabled={!!status && status.startsWith('Lendo')}
        onClick={() => input.current?.click()}>
        <DocumentAddLinearIcon className="size-5" />{result ? 'Trocar PDF' : 'Escolher PDF'}
      </Button>}
      <input ref={input} type="file" accept="application/pdf,.pdf" className="sr-only" onChange={e => onFile(e.target.files?.[0])} />
      {status && (
        <p className="flex flex-col items-center gap-2 px-4 text-center text-footnote text-muted-foreground">
          {status.startsWith('Lendo') && <LoadingDots />}{status}
        </p>
      )}

      {result && (
        <>
          <ListGroup>
            {bankTotal != null && <ListRow title="Fatura do banco" trailing={<Money cents={bankTotal} size="inherit" tone="inherit" />} />}
            <ListRow title="No app" trailing={<Money cents={appTotal} size="inherit" tone="inherit" />} />
            {rateSaved != null && (
              <ListRow title="Juros do rotativo" subtitle="Salvo no cartão"
                trailing={<span className="tabular-nums">{rateSaved.toLocaleString('pt-BR')}% a.m.</span>} />
            )}
            {bankTotal != null && (
              <ListRow title="Diferença" trailing={
                <span className={`font-semibold tabular-nums ${bankTotal === appTotal ? 'text-success' : 'text-destructive'}`}>
                  {bankTotal === appTotal ? 'Bateu' : formatCurrency(bankTotal - appTotal)}
                </span>} />
            )}
          </ListGroup>

          {result.missing.length > 0 && (
            <ListGroup header={`Faltam no app · ${result.missing.length}`}>
              {result.missing.map((i, k) => (
                <ListRow key={`m${k}`} title={i.description}
                  subtitle={shared ? (
                    <span className="flex items-center gap-1">{label(i)} · De
                      <SelectField value={owners[keyOf(i)] ?? me} options={peopleOptions}
                        onChange={v => setOwners(o => ({ ...o, [keyOf(i)]: v }))} className="h-auto text-subheadline" />
                    </span>
                  ) : label(i)}
                  trailing={
                    <span className="flex items-center gap-2">
                      <Money cents={i.amount} size="inherit" tone="inherit" />
                      <Button variant="plain" size="nav" disabled={!!busy} onClick={() => run(`m${k}`, () => add(i), 'Compra adicionada')}>Adicionar</Button>
                    </span>} />
              ))}
              {result.missing.length > 1 && (
                <li className="p-3">
                  <Button className="w-full" disabled={!!busy}
                    onClick={() => run('all', async () => { for (const i of result.missing) await add(i) }, 'Compras adicionadas')}>
                    Adicionar todas
                  </Button>
                </li>
              )}
            </ListGroup>
          )}

          {result.extra.length > 0 && (
            <ListGroup header={`No app, mas não na fatura · ${result.extra.length}`} footer="Pode ser compra lançada no cartão errado ou em outra fatura.">
              {result.extra.map(t => (
                <ListRow key={t.id} title={t.place ?? t.description ?? 'Gasto'}
                  subtitle={`${formatDate(t.date).slice(0, 5)}${t.installmentN ? ` · parcela ${t.installmentN} de ${t.installmentsTotal}` : ''}${shared ? ` · ${nameOf(t.owner)}` : ''}`}
                  trailing={
                    <span className="flex items-center gap-2">
                      <Money cents={t.amount} size="inherit" tone="inherit" />
                      <Button variant="plain-destructive" size="nav" disabled={!!busy}
                        onClick={() => confirmDel.ask({ title: 'Excluir compra?', remove: async () => { await transactionsApi.remove(t.id); await compare(items) } })}>
                        Excluir
                      </Button>
                    </span>} />
              ))}
            </ListGroup>
          )}

          <ListGroup header={shared ? `Conferidas · ${result.matched.length}` : undefined}
            footer={result.missing.length === 0 && result.extra.length === 0 ? 'Tudo certo com esta fatura.' : undefined}>
            {shared ? result.matched.map(({ tx }) => (
              <ListRow key={tx.id} title={tx.place ?? tx.description ?? 'Gasto'}
                subtitle={
                  <span className="flex items-center gap-1">{formatDate(tx.date).slice(0, 5)} · De
                    <SelectField value={tx.owner} options={peopleOptions} className="h-auto text-subheadline"
                      onChange={v => { if (v && v !== tx.owner) run(tx.id, () => reassign(tx.id, v), 'Salvo') }} />
                  </span>}
                trailing={<Money cents={tx.amount} size="inherit" tone="inherit" />} />
            )) : (
              <ListRow title="Conferidas" trailing={<span className="tabular-nums text-success">{result.matched.length}</span>} />
            )}
          </ListGroup>
        </>
      )}
    </div>
  )
}
