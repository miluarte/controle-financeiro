'use client'

import { TransactionItem } from './transaction-item'
import { ListGroup } from '@/components/ios/list-group'
import { EmptyState } from '@/components/shared/empty-state'
import { useCategories } from '@/hooks/use-categories'
import { useInstallmentTotals } from '@/hooks/use-installment-totals'
import { useWallets } from '@/hooks/use-wallets'
import type { Transaction } from '@/lib/types'
import { dayLabel } from '@/lib/utils'
import { useTransactionDelete } from './use-transaction-delete'
import { usePinAction } from './use-pin-action'
import { displayCategoryMap } from '@/lib/categories'

interface TransactionDayListProps {
  transactions: Transaction[]
  emptyTitle?: string
  emptyText?: string
  onSelect?: (t: Transaction) => void
  // compra parcelada com o valor cheio e "em Nx" (Início e Transações); false mostra a parcela (faturas)
  fullPurchase?: boolean
}

// TRA-1: lista por dia, direto no fundo da tela (sem card), no Início e em Transações.
export function TransactionDayList({
  transactions,
  emptyTitle = 'Nenhuma transação',
  emptyText = 'Nenhum gasto registrado neste mês',
  onSelect,
  fullPurchase = true,
}: TransactionDayListProps) {
  const { categories } = useCategories()
  const { wallets } = useWallets()
  const del = useTransactionDelete()
  const pin = usePinAction()
  // compra parcelada aparece com o valor cheio e "em Nx" (cartões e faturas seguem com a parcela)
  const totalOf = useInstallmentTotals(transactions)
  const catById = displayCategoryMap(categories)
  const walletById = new Map(wallets.map(w => [w.id, w]))

  if (transactions.length === 0) {
    return (
      <EmptyState variant="block" title={emptyTitle}>{emptyText}</EmptyState>
    )
  }

  const groups: { day: string; items: Transaction[] }[] = []
  for (const t of transactions) {
    const last = groups[groups.length - 1]
    if (last && last.day === t.date) last.items.push(t)
    else groups.push({ day: t.date, items: [t] })
  }

  return (
    <div className="space-y-5">
      {del.sheet}
      {pin.sheet}
      {groups.map(g => (
        <ListGroup key={g.day} header={dayLabel(g.day)} variant="plain">
          {g.items.map(t => (
            <TransactionItem
              key={t.id}
              transaction={t}
              category={t.categoryId ? catById.get(t.categoryId) : undefined}
              wallet={t.walletId ? walletById.get(t.walletId) : undefined}
              onClick={onSelect ? () => onSelect(t) : undefined}
              onDelete={() => del.ask(t)}
              swipeExtra={pin.extra(t)}
              pinned={pin.pinned(t)}
              purchaseTotal={fullPurchase ? totalOf(t) : undefined}
            />
          ))}
        </ListGroup>
      ))}
    </div>
  )
}
