'use client'

import type { BudgetGoal } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface BudgetProgressBarProps {
  goal: BudgetGoal
  spent: number
}

export function BudgetProgressBar({ goal, spent }: BudgetProgressBarProps) {
  const pct = Math.min(100, Math.round((spent / goal.monthlyLimit) * 100))
  const over = spent > goal.monthlyLimit

  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="font-medium">{formatCurrency(spent)}</span>
        <span className="text-muted-foreground">/ {formatCurrency(goal.monthlyLimit)}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn('h-full rounded-full transition-all', over ? 'bg-destructive' : 'bg-primary')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
