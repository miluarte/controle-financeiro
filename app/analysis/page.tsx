'use client'

import { BudgetCard } from '@/components/analysis/budget-card'
import { CategoryBreakdown } from '@/components/analysis/category-breakdown'
import { HistoryList } from '@/components/analysis/history-list'
import { MonthComparison } from '@/components/analysis/month-comparison'
import { PaceChart } from '@/components/analysis/pace-chart'
import { LargeTitleHeader } from '@/components/ios/large-title-header'
import { MonthSelector } from '@/components/shared/month-selector'
import { useMonth } from '@/hooks/use-month'
import { useMonthSummary } from '@/hooks/use-month-summary'
import { useMonthTransactions } from '@/hooks/use-month-transactions'
import { cumulativeSpending, elapsedDays, spendingUntilDay } from '@/lib/analysis'
import { addMonths } from '@/lib/utils'

export default function AnalysisPage() {
  const { month } = useMonth()
  const prevMonth = addMonths(month, -1)
  const { summary } = useMonthSummary(month)
  const { transactions } = useMonthTransactions(month)
  const { transactions: prevTransactions } = useMonthTransactions(prevMonth)

  const day = elapsedDays(month)
  const cumulative = cumulativeSpending(transactions, month)
  const spent = summary?.spending ?? 0
  const budget = summary?.budget ?? null
  const compareDay = Math.max(day, 1)

  return (
    <>
      <LargeTitleHeader title="Análise" actions={<MonthSelector />} />
      <div className="space-y-7 px-4 pt-2">
        <BudgetCard month={month} spent={spent} budget={budget} />
        {budget ? <PaceChart cumulative={cumulative} budget={budget} day={day} /> : null}
        <MonthComparison
          current={spendingUntilDay(transactions, compareDay)}
          previous={spendingUntilDay(prevTransactions, compareDay)}
          prevMonth={prevMonth}
          day={compareDay}
        />
        <CategoryBreakdown month={month} />
        <HistoryList />
      </div>
    </>
  )
}
