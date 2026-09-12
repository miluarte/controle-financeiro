'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base capitalize">{monthLabel(month)}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Entrou</span>
              <span className="font-medium text-green-600">{formatCurrency(totalIncome)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Saiu</span>
              <span className="font-medium text-red-600">{formatCurrency(totalExpense)}</span>
            </div>
            <div className="flex items-center justify-between border-t pt-3">
              <span className="text-sm font-medium">Saldo do mês</span>
              <span className={cn('text-lg font-semibold', balance < 0 ? 'text-destructive' : 'text-foreground')}>
                {formatCurrency(balance)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
