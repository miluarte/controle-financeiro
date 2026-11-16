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
import { formatCurrency, formatDate, monthLabel, todayIso } from '@/lib/utils'
import { DateField } from '@/components/shared/date-field'
import { LateCostGroup } from './late-cost-group'

export interface InvoiceRef {
  wallet: OwnWallet
  ref: string       // AAAA-MM
  dueDate: string   // AAAA-MM-DD
  total: number      // a pagar (sem as compras já pagas antes)
  prepaid?: number   // compras desta fatura pagas antes
  paidAt: string | null
}

// CON-8: fatura do cartão (compras do período, total e pagamento).
export function InvoiceSheet({ invoice, onClose }: { invoice: InvoiceRef | null; onClose: () => void }) {
  return (
    <ModalSheet open={!!invoice} onOpenChange={o => { if (!o) onClose() }} title={invoice ? `Fatura ${invoice.wallet.name}` : ''}>
      {invoice && <Body key={`${invoice.wallet.id}-${invoice.ref}`} inv={invoice} onDone={onClose} />}
    </ModalSheet>
  )
}

function Body({ inv, onDone }: { inv: InvoiceRef; onDone: () => void }) {
  const { wallets } = useWallets()
  const { categories } = useCategories()
  const { profile } = useProfile()
  const refresh = useRefresh()
  const payable = wallets.filter(w => !w.ownerName && w.type !== 'credit')
  const [walletId, setWalletId] = useState<string | null>(
    payable.find(w => w.id === profile?.defaultWalletId)?.id ?? payable[0]?.id ?? null,
  )
  const [payDate, setPayDate] = useState(todayIso())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { data: purchases } = useSWR(['invoice-tx', inv.wallet.id, inv.ref], () =>
    transactionsApi.getByInvoice(inv.wallet.id, `${inv.ref}-01`))
  const catById = new Map(categories.map(c => [c.id, c]))
  const count = (purchases ?? []).length

  async function run(fn: () => Promise<void>) {
    setBusy(true); setError(null)
    try { await fn(); await refresh(); onDone() }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível concluir.') }
    finally { setBusy(false) }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-large-title font-bold tabular-nums">{formatCurrency(inv.total)}</p>
        <p className="text-subheadline text-muted-foreground">
          Fatura de {monthLabel(inv.ref)} · vence {formatDate(inv.dueDate)}
        </p>
        {!!inv.prepaid && (
          <p className="text-footnote text-muted-foreground">{formatCurrency(inv.prepaid)} já pago antes</p>
        )}
      </div>

      {inv.paidAt ? (
        <ListGroup footer={`Paga em ${formatDate(inv.paidAt)}.`}>
          <li className="p-3">
            <Button variant="outline" size="lg" className="w-full" disabled={busy}
              onClick={() => run(() => invoicesApi.unpay(inv.wallet.id, `${inv.ref}-01`))}>
              Desmarcar pagamento
            </Button>
          </li>
        </ListGroup>
      ) : inv.total > 0 ? (
        <>
          <ListGroup header="Pagar com" footer="Sai do saldo nesta data.">
            <WalletPicker wallets={payable} value={walletId} onChange={setWalletId} />
          </ListGroup>
          <ListGroup>
            <FormRow label="Data do pagamento" htmlFor="inv-date">
              <DateField id="inv-date" value={payDate} onChange={v => setPayDate(v || todayIso())} />
            </FormRow>
          </ListGroup>
          <Button size="lg" className="w-full" disabled={busy || !walletId}
            onClick={() => run(() => invoicesApi.pay(inv.wallet.id, `${inv.ref}-01`, walletId!, payDate))}>
            Pagar fatura
          </Button>
          <LateCostGroup wallet={inv.wallet} total={inv.total} dueDate={inv.dueDate} />
        </>
      ) : !!inv.prepaid && (
        <p className="px-4 text-center text-footnote text-muted-foreground">Todas as compras desta fatura já foram pagas.</p>
      )}

      {error && <p className="px-4 text-footnote text-destructive">{error}</p>}

      <ListGroup header={`Compras · ${count}`}>
        {(purchases ?? []).length === 0 && (
          <li className="p-4 text-center text-subheadline text-muted-foreground">Nenhuma compra nesta fatura.</li>
        )}
        {(purchases ?? []).map(t => (
          <TransactionItem
            key={t.id}
            transaction={t}
            category={t.categoryId ? catById.get(t.categoryId) : undefined}
          />
        ))}
      </ListGroup>
    </div>
  )
}
