'use client'

import Link from 'next/link'
import { useState } from 'react'
import { TransactionDayList } from '@/components/transactions/transaction-day-list'
import { TransactionEditSheet } from '@/components/transactions/transaction-edit-sheet'
import { useMonthTransactions } from '@/hooks/use-month-transactions'
import type { Transaction } from '@/lib/types'
import { LoadingBlock } from '@/components/shared/loading-dots'

// HOM-4: últimas transações do mês, com atalho "Ver todas".
export function RecentTransactions({ month, limit = 6 }: { month: string; limit?: number }) {
  const { transactions, loading } = useMonthTransactions(month)
  const [editing, setEditing] = useState<Transaction | null>(null)

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h2 className="text-title3 font-semibold">Últimas transações</h2>
        <Link href="/transactions" className="text-body text-tint active:opacity-50">Ver todas</Link>
      </div>
      {loading ? (
        <LoadingBlock />
      ) : (
        <TransactionDayList transactions={transactions.slice(0, limit)} onSelect={setEditing} />
      )}
      <TransactionEditSheet transaction={editing} onClose={() => setEditing(null)} />
    </section>
  )
}
