'use client'

import { TransactionItem } from './transaction-item'
import { ListGroup } from '@/components/ios/list-group'
import { useCategories } from '@/hooks/use-categories'
import { useWallets } from '@/hooks/use-wallets'
import type { Transaction } from '@/lib/types'
import { dayLabel } from '@/lib/utils'
import { useTransactionDelete } from './use-transaction-delete'
import { usePinAction } from './use-pin-action'

interface TransactionDayListProps {
  transactions: Transaction[]
  emptyTitle?: string
  emptyText?: string
  onSelect?: (t: Transaction) => void
}

// TRA-1: lista agrupada por dia, um grupo do iOS por dia.
export function TransactionDayList({
  transactions,
  emptyTitle = 'Nenhuma transação',
  emptyText = 'Nenhum gasto registrado neste mês',
  onSelect,
}: TransactionDayListProps) {
  const { categories } = useCategories()
  const { wallets } = useWallets()
  const del = useTransactionDelete()
  const pin = usePinAction()
  const catById = new Map(categories.map(c => [c.id, c]))
  const walletById = new Map(wallets.map(w => [w.id, w]))

  if (transactions.length === 0) {
    return (
      <div className="px-4 py-10 text-center">
        <p className="text-headline">{emptyTitle}</p>
        <p className="text-subheadline text-muted-foreground">{emptyText}</p>
      </div>
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
        <ListGroup key={g.day} header={dayLabel(g.day)}>
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
            />
          ))}
        </ListGroup>
      ))}
    </div>
  )
}
