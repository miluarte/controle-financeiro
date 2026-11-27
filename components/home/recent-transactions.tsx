'use client'

import { SectionHeader } from '@/components/ios/section-header'
import { TransactionDayList } from '@/components/transactions/transaction-day-list'
import { useShowTransaction } from '@/components/transactions/use-show-transaction'
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

export function RecentTransactions({ month, limit = 5 }: { month: string; limit?: number }) {
  const { transactions, loading } = useMonthTransactions(month)
  const showTransaction = useShowTransaction()

  return (
    <section className="space-y-3">
      <SectionHeader title="Transações recentes" action={{ label: 'Ver todas', href: `/transactions?mes=${month}` }} />
      {loading ? (
        <LoadingBlock />
      ) : (
        <TransactionDayList transactions={latest(transactions, limit)} onSelect={showTransaction} />
      )}
    </section>
  )
}
