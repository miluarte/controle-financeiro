'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { useConfirmDelete } from '@/components/ios/use-delete-action'
import { ModalSheet } from '@/components/ios/modal-sheet'
import { SettlementSheet } from '@/components/cards/settlement-sheet'
import { TransactionItem } from '@/components/transactions/transaction-item'
import { useCategories } from '@/hooks/use-categories'
import { useSettlements } from '@/hooks/use-family'
import { familyApi } from '@/lib/api/family'
import { transactionsApi } from '@/lib/api/transactions'
import type { CardDebt, Wallet } from '@/lib/types'
import { formatCurrency, formatDate, monthLabel, walletLabel } from '@/lib/utils'
import { Money } from '@/components/shared/money'
import { EmptyState } from '@/components/shared/empty-state'
import { displayCategoryMap } from '@/lib/categories'

export interface SharedInvoice { wallet: Wallet; debt: CardDebt }

// Fatura de um cartão de outra pessoa da família: só as minhas compras, quanto já acertei e quanto falta.
// "Informar acerto" aceita valor parcial; o resto fica como saldo devedor.
export function SharedInvoiceSheet({ invoice, onClose }: { invoice: SharedInvoice | null; onClose: () => void }) {
  const [paying, setPaying] = useState(false)
  const owner = invoice?.wallet.ownerName ?? 'titular'
  return (
    <>
      <ModalSheet open={!!invoice && !paying} onOpenChange={o => { if (!o) onClose() }}
        title={invoice ? `Fatura ${walletLabel(invoice.wallet)}` : ''}>
        {invoice && <Body key={`${invoice.wallet.id}-${invoice.debt.invoiceRef}`} inv={invoice} owner={owner} onPay={() => setPaying(true)} />}
      </ModalSheet>
      {invoice && (
        <SettlementSheet open={paying} onOpenChange={o => { setPaying(o); if (!o) onClose() }}
          card={invoice.wallet} debts={[invoice.debt]} />
      )}
    </>
  )
}

function Body({ inv, owner, onPay }: { inv: SharedInvoice; owner: string; onPay: () => void }) {
  const { categories } = useCategories()
  const { debt, wallet } = inv
  const ref = debt.invoiceRef.slice(0, 7)
  const { data: purchases } = useSWR(['invoice-tx', wallet.id, ref], () => transactionsApi.getByInvoice(wallet.id, `${ref}-01`))
  const catById = displayCategoryMap(categories)
  const list = purchases ?? []
  const paid = debt.open <= 0
  // acertos já informados que o titular ainda não confirmou (um por fatura: para informar outro, cancela este)
  const waiting = useSettlements(wallet.id).filter(st => st.status === 'reported' && st.invoiceRef === debt.invoiceRef)
  const toReport = Math.max(debt.open - debt.reported, 0)
  const cancel = useConfirmDelete()

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Money as="p" size="display" cents={paid ? debt.total : debt.open} />
        <p className="text-subheadline text-muted-foreground">
          {paid ? `Paga a ${owner}` : `Você deve a ${owner}`} · vence {formatDate(debt.dueDate)}
        </p>
        {!paid && debt.reported > 0 && (
          <Badge variant="warning" className="mt-2">Aguardando confirmação</Badge>
        )}
        {!paid && debt.settled > 0 && (
          <p className="text-footnote text-muted-foreground">{formatCurrency(debt.settled)} já acertado de {formatCurrency(debt.total)}</p>
        )}
      </div>

      {!paid && debt.reported === 0 && toReport > 0 && <Button size="lg" className="w-full" onClick={onPay}>Informar acerto</Button>}

      {waiting.length > 0 && (
        <ListGroup header="Aguardando confirmação" footer={`${owner} recebeu um aviso para confirmar.`}>
          {waiting.map(st => (
            <ListRow key={st.id} title={formatCurrency(st.amount)}
              subtitle={st.paidOn ? `Pago em ${formatDate(st.paidOn)}` : undefined}
              trailing={
                <Button type="button" variant="plain-destructive"
                  onClick={() => cancel.ask({ title: 'Cancelar este acerto?', label: 'Cancelar acerto', remove: () => familyApi.cancelSettlement(st.id) })}>
                  Cancelar
                </Button>
              } />
          ))}
        </ListGroup>
      )}
      {cancel.sheet}

      <ListGroup header={paid ? 'Compras pagas' : 'Suas compras'}
        footer={`Fatura de ${monthLabel(ref)}.`}>
        {list.length === 0 && <EmptyState>Nenhuma compra sua nesta fatura.</EmptyState>}
        {list.map(t => (
          <TransactionItem key={t.id} transaction={t} category={t.categoryId ? catById.get(t.categoryId) : undefined} />
        ))}
      </ListGroup>
    </div>
  )
}
