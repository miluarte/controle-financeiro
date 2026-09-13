'use client'

import { Card, CardContent } from '@/components/ui/card'
import { useTransactions } from '@/hooks/use-transactions'
import { formatCurrency, currentMonth, monthLabel, cn } from '@/lib/utils'

export function MonthlySummaryCard() {
  const month = currentMonth()
  const { transactions, loading, error } = useTransactions(month)

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)

  const balance = totalIncome - totalExpense

  if (loading) {
    return (
      <Card>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="flex flex-col items-center gap-1 text-center">
          <span className="text-sm text-muted-foreground capitalize">{monthLabel(month)}</span>
          <span className={cn('text-3xl font-semibold', balance < 0 ? 'text-destructive' : 'text-foreground')}>
            {formatCurrency(balance)}
          </span>
          <span className="text-xs text-muted-foreground">Saldo do mês</span>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">Entrou</span>
            <span className="text-lg font-semibold text-green-600">{formatCurrency(totalIncome)}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">Saiu</span>
            <span className="text-lg font-semibold text-red-600">{formatCurrency(totalExpense)}</span>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
