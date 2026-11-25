'use client'

import Link from 'next/link'
import { useState } from 'react'
import { TransactionDayList } from '@/components/transactions/transaction-day-list'
import { TransactionEditor } from '@/components/transactions/transaction-editor'
import { useMonthTransactions } from '@/hooks/use-month-transactions'
import type { Transaction } from '@/lib/types'
import { todayIso } from '@/lib/utils'
import { LoadingBlock } from '@/components/shared/loading-dots'

// HOM-4: últimas transações do mês, com atalho "Ver todas". "Últimas" = as registradas por último, sem
// parcelas com data futura (só o que já aconteceu); na lista, agrupadas por dia.
function latest(list: Transaction[], limit: number) {
  const today = todayIso()
  return list.filter(t => t.date <= today)
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    .slice(0, limit)
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function RecentTransactions({ month, limit = 6 }: { month: string; limit?: number }) {
  const { transactions, loading } = useMonthTransactions(month)
  const [editing, setEditing] = useState<Transaction | null>(null)

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h2 className="text-title3 font-semibold">Últimas transações</h2>
        <Link href="/transactions" className="text-body text-tint active:opacity-(--alpha-half)">Ver todas</Link>
      </div>
      {loading ? (
        <LoadingBlock />
      ) : (
        <TransactionDayList transactions={latest(transactions, limit)} onSelect={setEditing} />
      )}
      <TransactionEditor transaction={editing} onClose={() => setEditing(null)} />
    </section>
  )
}
