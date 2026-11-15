'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { TransactionEditSheet } from '@/components/transactions/transaction-edit-sheet'
import { TransactionItem } from '@/components/transactions/transaction-item'
import { useCategories } from '@/hooks/use-categories'
import { useMyDebts } from '@/hooks/use-family'
import { transactionsApi } from '@/lib/api/transactions'
import { openInvoiceRef } from '@/lib/invoice'
import type { Transaction, Wallet } from '@/lib/types'
import { addMonths, capitalize, formatCurrency, formatDate, monthName, todayIso } from '@/lib/utils'
import { InvoiceNavigator } from './invoice-navigator'

// VIS-1 e VIS-2: visão do membro. Só as próprias compras e quanto deve ao titular.
export function MemberCardView({ wallet }: { wallet: Wallet }) {
  const debts = useMyDebts().filter(d => d.walletId === wallet.id)
  const { categories } = useCategories()
  const openRef = openInvoiceRef({ closingDay: wallet.closingDay, closingDayInclusive: true }, todayIso())
  const nextRef = addMonths(openRef, 1)
  const [ref, setRef] = useState(openRef)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const { data: purchases } = useSWR(['invoice-tx', wallet.id, ref], () => transactionsApi.getByInvoice(wallet.id, `${ref}-01`))
  const catById = new Map(categories.map(c => [c.id, c]))
  const owner = wallet.ownerName ?? 'titular'

  const at = (r: string) => debts.find(d => d.invoiceRef.slice(0, 7) === r)
  const previous = debts.filter(d => d.invoiceRef.slice(0, 7) < openRef && d.open > 0)
  const committed = debts.filter(d => d.invoiceRef.slice(0, 7) > nextRef).reduce((s, d) => s + d.open, 0)
  const list = purchases ?? []

  return (
    <div className="space-y-7">
      <section className="space-y-1 rounded-3xl bg-grouped p-4 text-center">
        <p className="text-subheadline text-muted-foreground">Você deve a {owner} na fatura de {monthName(openRef)}</p>
        <p className="text-large-title font-bold tabular-nums">{formatCurrency(at(openRef)?.open ?? 0)}</p>
      </section>

      <ListGroup footer="As compras parceladas aparecem em cada fatura futura.">
        <ListRow title={`Próxima fatura (${monthName(nextRef, 'short')})`} trailing={formatCurrency(at(nextRef)?.open ?? 0)} />
        {previous.map(d => (
          <ListRow key={d.invoiceRef} title={`${capitalize(monthName(d.invoiceRef.slice(0, 7)))} em aberto`}
            subtitle={`Venceu ${formatDate(d.dueDate)}`} trailing={formatCurrency(d.open)} />
        ))}
        <ListRow title="Já comprometido nas próximas faturas" trailing={formatCurrency(committed)} />
      </ListGroup>

      <InvoiceNavigator value={ref} onChange={setRef} caption={`Suas compras · ${formatCurrency(list.reduce((s, t) => s + t.amount, 0))}`} />

      <ListGroup header="Suas compras">
        {list.length === 0 && <li className="p-4 text-center text-subheadline text-muted-foreground">Nenhuma compra sua nesta fatura.</li>}
        {list.map(t => (
          <TransactionItem key={t.id} transaction={t}
            category={t.categoryId ? catById.get(t.categoryId) : undefined}
            onClick={() => setEditing(t)} />
        ))}
      </ListGroup>
      <TransactionEditSheet transaction={editing} onClose={() => setEditing(null)} />
    </div>
  )
}
