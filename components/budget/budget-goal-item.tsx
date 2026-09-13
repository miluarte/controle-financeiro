'use client'

import { Button } from '@/components/ui/button'
import { CloseIcon } from '@solar-icons/react'
import { useBudgetGoals } from '@/hooks/use-budget-goals'
import { useCategories } from '@/hooks/use-categories'
import { useTransactions } from '@/hooks/use-transactions'
import { BudgetProgressBar } from './budget-progress-bar'
import { currentMonth } from '@/lib/utils'

export function BudgetGoalItem() {
  const { goals, loading, error, remove } = useBudgetGoals()
  const { categories } = useCategories()
  const { transactions } = useTransactions(currentMonth())

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>
  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (goals.length === 0)
    return <p className="text-sm text-muted-foreground">Nenhuma meta definida.</p>

  function spentFor(categoryId: string) {
    return transactions
      .filter(t => t.type === 'expense' && t.categoryId === categoryId)
      .reduce((sum, t) => sum + t.amount, 0)
  }

  return (
    <div className="space-y-4">
      {goals.map(goal => {
        const category = categories.find(c => c.id === goal.categoryId)
        return (
          <div key={goal.id} className="flex items-start gap-2">
            <div className="flex-1">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium">{category?.name ?? 'Categoria removida'}</span>
                {goal.isRecurring && (
                  <span className="text-xs text-muted-foreground">Recorrente</span>
                )}
              </div>
              <BudgetProgressBar goal={goal} spent={spentFor(goal.categoryId)} />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="mt-0.5"
              onClick={() => { remove(goal.id).catch(() => {}) }}
            >
              <CloseIcon className="size-4" />
            </Button>
          </div>
        )
      })}
    </div>
  )
}
