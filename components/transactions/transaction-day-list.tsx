'use client'

import { TransactionItem } from './transaction-item'
import { ListGroup } from '@/components/ios/list-group'
import { EmptyState } from '@/components/shared/empty-state'
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
  // complemento do subtítulo de cada linha (ex.: "de Ana") e linhas sem excluir/fixar no deslizar
  // (ex.: compra dividida somada numa linha só)
  describe?: (t: Transaction) => { note?: string; locked?: boolean }
}

// TRA-1: lista por dia, direto no fundo da tela (sem card), igual em todas as telas.
export function TransactionDayList({
  transactions,
  emptyTitle = 'Nenhuma transação',
  emptyText = 'Nenhum gasto registrado neste mês',
  onSelect,
  describe,
}: TransactionDayListProps) {
  const { categories } = useCategories()
  const { wallets } = useWallets()
  const del = useTransactionDelete()
  const pin = usePinAction()
  const catById = new Map(categories.map(c => [c.id, c]))
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
          {g.items.map(t => {
            const row = describe?.(t) ?? {}
            return (
              <TransactionItem
                key={t.id}
                transaction={t}
                category={t.categoryId ? catById.get(t.categoryId) : undefined}
                wallet={t.walletId ? walletById.get(t.walletId) : undefined}
                note={row.note}
                onClick={onSelect ? () => onSelect(t) : undefined}
                onDelete={row.locked ? undefined : () => del.ask(t)}
                swipeExtra={row.locked ? undefined : pin.extra(t)}
                pinned={pin.pinned(t)}
              />
            )
          })}
        </ListGroup>
      ))}
    </div>
  )
}
