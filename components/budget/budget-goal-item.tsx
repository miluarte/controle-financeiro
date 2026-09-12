'use client'

import { useBudgetGoals } from '@/hooks/use-budget-goals'
import { BudgetProgressBar } from './budget-progress-bar'

export function BudgetGoalItem() {
  const { goals, loading, error } = useBudgetGoals()

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>
  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (goals.length === 0)
    return <p className="text-sm text-muted-foreground">Nenhuma meta definida.</p>

  return (
    <div className="space-y-3">
      {goals.map(goal => (
        <BudgetProgressBar key={goal.id} goal={goal} spent={0} />
      ))}
    </div>
  )
}
