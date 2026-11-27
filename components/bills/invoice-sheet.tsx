'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { FormRow } from '@/components/ios/form-row'
import { ListGroup } from '@/components/ios/list-group'
import { ModalSheet } from '@/components/ios/modal-sheet'
import { WalletPicker } from '@/components/shared/wallet-picker'
import { TransactionItem } from '@/components/transactions/transaction-item'
import { useCategories } from '@/hooks/use-categories'
import { useProfile } from '@/hooks/use-profile'
import { useRefresh } from '@/hooks/use-refresh'
import { useWallets } from '@/hooks/use-wallets'
import { invoicesApi } from '@/lib/api/invoices'
import { transactionsApi } from '@/lib/api/transactions'
import type { OwnWallet } from '@/lib/types'
import { formatCurrency, formatDate, monthLabel, todayIso, walletLabel } from '@/lib/utils'
import { DateField } from '@/components/shared/date-field'
import { CurrencyInput } from '@/components/shared/currency-input'
import { LateCostGroup } from './late-cost-group'
import { ReconcileSheet } from './reconcile-sheet'
import { useTransactionDelete } from '@/components/transactions/use-transaction-delete'
import { usePinAction } from '@/components/transactions/use-pin-action'
import { feedback } from '@/lib/feedback'
import { Money } from '@/components/shared/money'
import { FormError } from '@/components/shared/form-error'
import { EmptyState } from '@/components/shared/empty-state'
import { Note } from '@/components/shared/note'
import { displayCategoryMap } from '@/lib/categories'

export interface InvoiceRef {
  wallet: OwnWallet
  ref: string       // AAAA-MM
  dueDate: string   // AAAA-MM-DD
  total: number      // a pagar (sem as compras já pagas antes)
  prepaid?: number   // compras desta fatura pagas antes
  paidAt: string | null
  paidAmount?: number // já pago (pagamento parcial); o resto é saldo devedor
}

// CON-8: fatura do cartão (compras do período, total e pagamento).
export function InvoiceSheet({ invoice, onClose }: { invoice: InvoiceRef | null; onClose: () => void }) {
  return (
    <ModalSheet open={!!invoice} onOpenChange={o => { if (!o) onClose() }} title={invoice ? `Fatura ${walletLabel(invoice.wallet)}` : ''}>
      {invoice && <Body key={`${invoice.wallet.id}-${invoice.ref}`} inv={invoice} onDone={onClose} />}
    </ModalSheet>
  )
}

function Body({ inv, onDone }: { inv: InvoiceRef; onDone: () => void }) {
  const { wallets } = useWallets()
  const { categories } = useCategories()
  const { profile } = useProfile()
  const refresh = useRefresh()
  const delTx = useTransactionDelete()
  const pin = usePinAction()
  const payable = wallets.filter(w => !w.ownerName && w.type !== 'credit')
  const [walletId, setWalletId] = useState<string | null>(
    payable.find(w => w.id === profile?.defaultWalletId)?.id ?? payable[0]?.id ?? null,
  )
  const [payDate, setPayDate] = useState(todayIso())
  const paidSoFar = inv.paidAmount ?? 0
  const remaining = Math.max(inv.total - paidSoFar, 0)
  const [amount, setAmount] = useState(remaining)
  const left = Math.max(remaining - amount, 0)
  const [busy, setBusy] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { data: purchases } = useSWR(['invoice-tx', inv.wallet.id, inv.ref], () =>
    transactionsApi.getByInvoice(inv.wallet.id, `${inv.ref}-01`))
  const catById = displayCategoryMap(categories)
  const count = (purchases ?? []).length

  async function run(fn: () => Promise<void>, done: string) {
    setBusy(true); setError(null)
    try { await fn(); await refresh(); onDone(); feedback.done(done) }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível concluir.') }
    finally { setBusy(false) }
  }

  return (
    <div className="space-y-6">
      {delTx.sheet}
      {pin.sheet}
      <div className="text-center">
        <Money as="p" size="display" cents={inv.paidAt ? inv.total : remaining} />
        <p className="text-subheadline text-muted-foreground">
          Fatura de {monthLabel(inv.ref)} · vence {formatDate(inv.dueDate)}
        </p>
        {!inv.paidAt && paidSoFar > 0 && (
          <p className="text-footnote text-muted-foreground">Falta pagar · {formatCurrency(paidSoFar)} já pago de {formatCurrency(inv.total)}</p>
        )}
        {!!inv.prepaid && (
          <p className="text-footnote text-muted-foreground">{formatCurrency(inv.prepaid)} já pago antes</p>
        )}
      </div>

      {inv.paidAt ? (
        <ListGroup footer={`Paga em ${formatDate(inv.paidAt)}.`}>
          <li className="p-3">
            <Button variant="outline" size="lg" className="w-full" disabled={busy}
              onClick={() => run(() => invoicesApi.unpay(inv.wallet.id, `${inv.ref}-01`), 'Pagamento desfeito')}>
              Desfazer pagamento
            </Button>
          </li>
        </ListGroup>
      ) : remaining > 0 ? (
        <>
          <ListGroup header="Valor pago" footer={left > 0 ? `Fica faltando ${formatCurrency(left)}.` : undefined}>
            <FormRow label="Valor" htmlFor="inv-amount">
              <CurrencyInput id="inv-amount" variant="bare" value={amount} onChange={setAmount} className="text-right" />
            </FormRow>
          </ListGroup>
          <ListGroup header="Pagar com" footer="Sai do saldo nesta data.">
            <WalletPicker wallets={payable} value={walletId} onChange={setWalletId} />
          </ListGroup>
          <ListGroup>
            <FormRow label="Data do pagamento" htmlFor="inv-date">
              <DateField id="inv-date" value={payDate} onChange={v => setPayDate(v || todayIso())} />
            </FormRow>
          </ListGroup>
          <Button size="lg" className="w-full" disabled={busy || !walletId || amount <= 0}
            onClick={() => run(() => invoicesApi.pay(inv.wallet.id, `${inv.ref}-01`, walletId!, payDate, Math.min(amount, remaining)), 'Fatura paga')}>
            {left > 0 ? 'Pagar parte' : 'Pagar fatura'}
          </Button>
          {paidSoFar > 0 && (
            <Button variant="plain-destructive" size="nav" className="w-full" disabled={busy}
              onClick={() => run(() => invoicesApi.unpay(inv.wallet.id, `${inv.ref}-01`), 'Pagamento desfeito')}>
              Desfazer pagamentos
            </Button>
          )}
          <LateCostGroup wallet={inv.wallet} total={remaining} dueDate={inv.dueDate} />
        </>
      ) : !!inv.prepaid && (
        <Note>Todas as compras desta fatura já foram pagas.</Note>
      )}

      <FormError message={error} />

      <Button variant="secondary" size="lg" className="w-full" onClick={() => setChecking(true)}>
        Conferir com o PDF da fatura
      </Button>
      <ReconcileSheet open={checking} onOpenChange={setChecking} wallet={inv.wallet} invoiceRef={inv.ref} dueDate={inv.dueDate} />

      <ListGroup header={inv.paidAt ? `Compras pagas · ${count}` : `Compras · ${count}`}>
        {(purchases ?? []).length === 0 && (
          <EmptyState>Nenhuma compra nesta fatura.</EmptyState>
        )}
        {(purchases ?? []).map(t => (
          <TransactionItem
            key={t.id}
            transaction={t}
            category={t.categoryId ? catById.get(t.categoryId) : undefined}
            onDelete={() => delTx.ask(t)}
            swipeExtra={pin.extra(t)}
            pinned={pin.pinned(t)}
          />
        ))}
      </ListGroup>
    </div>
  )
}
