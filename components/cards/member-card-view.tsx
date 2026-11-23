'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import useSWR from 'swr'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { TransactionEditSheet } from '@/components/transactions/transaction-edit-sheet'
import { TransactionItem } from '@/components/transactions/transaction-item'
import { useCategories } from '@/hooks/use-categories'
import { useMyDebts, useSettlements } from '@/hooks/use-family'
import { familyApi } from '@/lib/api/family'
import { transactionsApi } from '@/lib/api/transactions'
import { openInvoiceRef } from '@/lib/invoice'
import type { Transaction, Wallet } from '@/lib/types'
import { addMonths, capitalize, formatCurrency, formatDate, monthName, todayIso } from '@/lib/utils'
import { InvoiceNavigator } from './invoice-navigator'
import { SettlementSheet } from './settlement-sheet'
import { useConfirmDelete } from '@/components/ios/use-delete-action'

// VIS-1 e VIS-2: visão do membro. Só as próprias compras e quanto deve ao titular.
export function MemberCardView({ wallet }: { wallet: Wallet }) {
  const debts = useMyDebts().filter(d => d.walletId === wallet.id)
  const { categories } = useCategories()
  const openRef = openInvoiceRef({ closingDay: wallet.closingDay, closingDayInclusive: true }, todayIso())
  const nextRef = addMonths(openRef, 1)
  const [ref, setRef] = useState(openRef)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [paying, setPaying] = useState(false)
  const settlements = useSettlements(wallet.id)
  const ask = useConfirmDelete()
  const waiting = settlements.filter(st => st.status === 'reported')
  const confirmed = settlements.filter(st => st.status === 'confirmed')
  // faturas com saldo, das mais antigas para as mais novas (fechadas primeiro)
  const payable = debts.filter(d => d.open > 0 && d.reported === 0 && d.invoiceRef.slice(0, 7) <= nextRef)
  const { data: purchases } = useSWR(['invoice-tx', wallet.id, ref], () => transactionsApi.getByInvoice(wallet.id, `${ref}-01`))
  const catById = new Map(categories.map(c => [c.id, c]))
  const owner = wallet.ownerName ?? 'titular'

  const at = (r: string) => debts.find(d => d.invoiceRef.slice(0, 7) === r)
  const previous = debts.filter(d => d.invoiceRef.slice(0, 7) < openRef && d.open > 0)
  const committed = debts.filter(d => d.invoiceRef.slice(0, 7) > nextRef).reduce((s, d) => s + d.open, 0)
  const list = purchases ?? []

  return (
    <div className="space-y-7">
      {ask.sheet}
      <section className="space-y-1 rounded-3xl bg-grouped p-4 text-center">
        <p className="text-subheadline text-muted-foreground">Você deve a {owner} na fatura de {monthName(openRef)}</p>
        <p className="text-large-title font-bold tabular-nums">{formatCurrency(at(openRef)?.open ?? 0)}</p>
        {(at(openRef)?.settled ?? 0) > 0 && (
          <p className="text-footnote text-muted-foreground">{formatCurrency(at(openRef)!.settled)} já acertado de {formatCurrency(at(openRef)!.total)}</p>
        )}
        {payable.length > 0 && (
          <Button size="lg" className="mt-3 w-full" onClick={() => setPaying(true)}>Informar acerto</Button>
        )}
      </section>

      {waiting.length > 0 && (
        <ListGroup header="Aguardando confirmação" footer={`${owner} recebeu um aviso para confirmar.`}>
          {waiting.map(st => (
            <ListRow key={st.id} title={formatCurrency(st.amount)}
              subtitle={`Fatura de ${monthName((st.invoiceRef ?? '').slice(0, 7))}${st.paidOn ? ` · pago em ${formatDate(st.paidOn)}` : ''}`}
              trailing={
                <button type="button" className="text-body text-destructive"
                  onClick={() => ask.ask({ title: 'Cancelar acerto?', label: 'Cancelar acerto', remove: () => familyApi.cancelSettlement(st.id) })}>
                  Cancelar
                </button>
              } />
          ))}
        </ListGroup>
      )}

      <ListGroup >
        <ListRow title={`Próxima fatura (${monthName(nextRef, 'short')})`} trailing={formatCurrency(at(nextRef)?.open ?? 0)} />
        {previous.map(d => (
          <ListRow key={d.invoiceRef} title={`${capitalize(monthName(d.invoiceRef.slice(0, 7)))} em aberto`}
            subtitle={`Venceu ${formatDate(d.dueDate)}`} trailing={formatCurrency(d.open)} />
        ))}
        <ListRow title="Já comprometido" trailing={formatCurrency(committed)} />
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
      {confirmed.length > 0 && (
        <ListGroup header="Acertos confirmados">
          {confirmed.map(st => (
            <ListRow key={st.id} title={formatCurrency(st.amount)}
              subtitle={`Fatura de ${monthName((st.invoiceRef ?? '').slice(0, 7))}${st.confirmedAt ? ` · confirmado em ${formatDate(st.confirmedAt.slice(0, 10))}` : ''}`} />
          ))}
        </ListGroup>
      )}
      <TransactionEditSheet transaction={editing} onClose={() => setEditing(null)} />
      <SettlementSheet open={paying} onOpenChange={setPaying} card={wallet} debts={payable} />
    </div>
  )
}
