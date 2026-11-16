'use client'

import { useRef, useState } from 'react'
import { DocumentAddLinearIcon } from '@solar-icons/react'
import { Button } from '@/components/ui/button'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { ModalSheet } from '@/components/ios/modal-sheet'
import { useRefresh } from '@/hooks/use-refresh'
import { transactionsApi } from '@/lib/api/transactions'
import { openInvoiceRef } from '@/lib/invoice'
import { reconcile, type Reconciliation } from '@/lib/reconcile'
import { installmentFirstDate, parseStatement, pdfLines, type StatementItem } from '@/lib/statement'
import type { OwnWallet } from '@/lib/types'
import { daysInMonth, formatCurrency, formatDate } from '@/lib/utils'

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

function Reconcile({ wallet, invoiceRef, dueDate }: { wallet: OwnWallet; invoiceRef: string; dueDate: string }) {
  const refresh = useRefresh()
  const input = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [bankTotal, setBankTotal] = useState<number | null>(null)
  const [result, setResult] = useState<Reconciliation | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [items, setItems] = useState<StatementItem[]>([])

  async function compare(list: StatementItem[]) {
    const txs = await transactionsApi.getByInvoice(wallet.id, `${invoiceRef}-01`)
    setResult(reconcile(list, txs))
  }

  async function onFile(file: File | undefined) {
    if (!file) return
    setStatus('Lendo o PDF…'); setResult(null)
    try {
      const st = parseStatement(await pdfLines(await file.arrayBuffer()), dueDate)
      const list = st.carried
        ? [...st.items, { date: `${invoiceRef}-01`, description: 'Saldo da fatura anterior', amount: st.carried, installmentN: null, installmentsTotal: null }]
        : st.items
      if (!list.length) { setStatus('Não achei lançamentos neste PDF.'); return }
      setItems(list); setBankTotal(st.total)
      await compare(list)
      setStatus(null)
    } catch {
      setStatus('Não consegui ler este PDF.')
    } finally {
      if (input.current) input.current.value = ''
    }
  }

  // data dentro desta fatura: a do banco, ou o dia do fechamento se ela cair em outra fatura
  function dateInInvoice(date: string) {
    if (openInvoiceRef(wallet, date) === invoiceRef) return date
    const day = Math.min(wallet.closingDay ?? 1, daysInMonth(invoiceRef)) - (wallet.closingDayInclusive ? 0 : 1)
    return `${invoiceRef}-${String(Math.max(day, 1)).padStart(2, '0')}`
  }

  async function add(item: StatementItem) {
    if (item.installmentN && item.installmentsTotal) {
      await transactionsApi.createInstallments({
        walletId: wallet.id, categoryId: null, place: item.description, installments: item.installmentsTotal,
        total: item.amount * item.installmentsTotal, firstDate: installmentFirstDate(item, invoiceRef), start: item.installmentN,
      })
    } else {
      await transactionsApi.create({
        type: 'expense', amount: item.amount, date: dateInInvoice(item.date), categoryId: null,
        walletId: wallet.id, place: item.description, description: null, source: 'import',
      })
    }
  }

  async function run(key: string, fn: () => Promise<unknown>) {
    setBusy(key)
    try { await fn(); await refresh(); await compare(items) }
    catch (err) { alert(err instanceof Error ? err.message : 'Não foi possível concluir.') }
    finally { setBusy(null) }
  }

  const appTotal = result ? [...result.matched.map(m => m.tx), ...result.extra].reduce((s, t) => s + t.amount, 0) : 0

  return (
    <div className="space-y-6">
      <Button variant="secondary" size="lg" className="w-full gap-2" disabled={!!status && status.startsWith('Lendo')}
        onClick={() => input.current?.click()}>
        <DocumentAddLinearIcon className="size-5" />{result ? 'Escolher outro PDF' : 'Escolher PDF da fatura'}
      </Button>
      <input ref={input} type="file" accept="application/pdf,.pdf" className="sr-only" onChange={e => onFile(e.target.files?.[0])} />
      {status && <p className="px-4 text-center text-footnote text-muted-foreground">{status}</p>}

      {result && (
        <>
          <ListGroup>
            {bankTotal != null && <ListRow title="Fatura do banco" trailing={<span className="tabular-nums">{formatCurrency(bankTotal)}</span>} />}
            <ListRow title="No app" trailing={<span className="tabular-nums">{formatCurrency(appTotal)}</span>} />
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
                <ListRow key={`m${k}`} title={i.description} subtitle={label(i)}
                  trailing={
                    <span className="flex items-center gap-2">
                      <span className="tabular-nums">{formatCurrency(i.amount)}</span>
                      <Button variant="plain" size="nav" disabled={!!busy} onClick={() => run(`m${k}`, () => add(i))}>Adicionar</Button>
                    </span>} />
              ))}
              {result.missing.length > 1 && (
                <li className="p-3">
                  <Button className="w-full" disabled={!!busy}
                    onClick={() => run('all', async () => { for (const i of result.missing) await add(i) })}>
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
                  subtitle={`${formatDate(t.date).slice(0, 5)}${t.installmentN ? ` · parcela ${t.installmentN} de ${t.installmentsTotal}` : ''}`}
                  trailing={
                    <span className="flex items-center gap-2">
                      <span className="tabular-nums">{formatCurrency(t.amount)}</span>
                      <Button variant="plain-destructive" size="nav" disabled={!!busy}
                        onClick={() => { if (confirm('Excluir este lançamento do app?')) run(t.id, () => transactionsApi.remove(t.id)) }}>
                        Excluir
                      </Button>
                    </span>} />
              ))}
            </ListGroup>
          )}

          <ListGroup footer={result.missing.length === 0 && result.extra.length === 0 ? 'Tudo certo com esta fatura.' : undefined}>
            <ListRow title="Conferidas" trailing={<span className="tabular-nums text-success">{result.matched.length}</span>} />
          </ListGroup>
        </>
      )}
    </div>
  )
}
