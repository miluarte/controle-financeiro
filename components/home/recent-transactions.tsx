'use client'

import { TransactionDayList } from '@/components/transactions/transaction-day-list'
import { useMonthTransactions } from '@/hooks/use-month-transactions'

// HOM-4: últimas transações do mês.
export function RecentTransactions({ month, limit = 8 }: { month: string; limit?: number }) {
  const { transactions, loading } = useMonthTransactions(month)

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Últimas transações</h2>
      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <TransactionDayList transactions={transactions.slice(0, limit)} />
      )}
    </section>
  )
}
