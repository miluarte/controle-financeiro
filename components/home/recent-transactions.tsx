'use client'

import { TransactionDayList } from '@/components/transactions/transaction-day-list'
import { useMonthTransactions } from '@/hooks/use-month-transactions'

// HOM-4: últimas transações do mês.
export function RecentTransactions({ month, limit = 8 }: { month: string; limit?: number }) {
  const { transactions, loading } = useMonthTransactions(month)

  return (
    <section className="space-y-2">
      <h2 className="text-title3 font-semibold">Últimas transações</h2>
      {loading ? (
        <p className="text-subheadline text-muted-foreground">Carregando…</p>
      ) : (
        <TransactionDayList transactions={transactions.slice(0, limit)} />
      )}
    </section>
  )
}
