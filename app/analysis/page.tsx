'use client'

import { BudgetCard } from '@/components/analysis/budget-card'
import { CategoryBreakdown } from '@/components/analysis/category-breakdown'
import { HistoryList } from '@/components/analysis/history-list'
import { AdvancedEntry } from '@/components/analysis/advanced-entry'
import { ReplanEntry } from '@/components/analysis/replan-entry'
import { LargeTitleHeader } from '@/components/ios/large-title-header'
import { MonthSelector } from '@/components/shared/month-selector'
import { useMonth } from '@/hooks/use-month'
import { useMonthSummary } from '@/hooks/use-month-summary'
import { useMonthTransactions } from '@/hooks/use-month-transactions'
import { cumulativeSpending, elapsedDays } from '@/lib/analysis'

export default function AnalysisPage() {
  const { month } = useMonth()
  const { summary } = useMonthSummary(month)
  const { transactions } = useMonthTransactions(month)

  const day = elapsedDays(month)
  const cumulative = cumulativeSpending(transactions, month)
  const spent = summary?.spending ?? 0
  const budget = summary?.budget ?? null

  return (
    <>
      <LargeTitleHeader title="Análise" actions={<MonthSelector />} />
      <div className="space-y-7 px-4 pt-2">
        <BudgetCard month={month} spent={spent} budget={budget} cumulative={cumulative} day={day} />
        <CategoryBreakdown month={month} />
        <ReplanEntry />
        <AdvancedEntry />
        <HistoryList />
      </div>
    </>
  )
}
