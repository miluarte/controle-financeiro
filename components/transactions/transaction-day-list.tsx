'use client'

import { TransactionItem } from './transaction-item'
import { useCategories } from '@/hooks/use-categories'
import { useWallets } from '@/hooks/use-wallets'
import type { Transaction } from '@/lib/types'
import { dayLabel } from '@/lib/utils'

interface TransactionDayListProps {
  transactions: Transaction[]
  emptyTitle?: string
  emptyText?: string
}

// TRA-1: lista agrupada por dia.
export function TransactionDayList({
  transactions,
  emptyTitle = 'Nenhuma transação',
  emptyText = 'Nenhum gasto registrado neste mês',
}: TransactionDayListProps) {
  const { categories } = useCategories()
  const { wallets } = useWallets()
  const catById = new Map(categories.map(c => [c.id, c]))
  const walletById = new Map(wallets.map(w => [w.id, w]))

  if (transactions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-center">
        <p className="font-medium">{emptyTitle}</p>
        <p className="text-sm text-muted-foreground">{emptyText}</p>
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
    <div className="space-y-4">
      {groups.map(g => (
        <section key={g.day}>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{dayLabel(g.day)}</h3>
          <ul className="divide-y">
            {g.items.map(t => (
              <TransactionItem
                key={t.id}
                transaction={t}
                category={t.categoryId ? catById.get(t.categoryId) : undefined}
                wallet={t.walletId ? walletById.get(t.walletId) : undefined}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
