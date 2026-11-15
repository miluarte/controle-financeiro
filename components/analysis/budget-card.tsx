'use client'

import { useState } from 'react'
import { ProgressBar, toneFor } from '@/components/shared/progress-bar'
import { BudgetSheet } from './budget-sheet'
import { formatCurrency, monthName } from '@/lib/utils'
import { freePerDay } from '@/lib/analysis'

// ANA-1 e ANA-3: gasto do mês contra o orçamento, quanto resta e quanto está livre por dia.
export function BudgetCard({ month, spent, budget }: { month: string; spent: number; budget: number | null }) {
  const [editing, setEditing] = useState(false)
  const ratio = budget ? spent / budget : 0
  const remaining = (budget ?? 0) - spent

  return (
    <section className="space-y-3 rounded-3xl bg-grouped p-4">
      <div>
        <p className="text-subheadline text-muted-foreground">Gasto em {monthName(month)}</p>
        <p className="text-title1 font-bold tabular-nums">{formatCurrency(spent)}</p>
      </div>
      {budget ? (
        <>
          <ProgressBar value={ratio} tone={toneFor(ratio)} />
          <p className="text-footnote text-muted-foreground">
            {Math.round(ratio * 100)}% de {formatCurrency(budget)} em {monthName(month)} ·{' '}
            <button type="button" onClick={() => setEditing(true)} className="text-tint">editar</button>
          </p>
          <dl className="grid grid-cols-2 gap-2 border-t border-separator pt-3">
            <div>
              <dt className="text-footnote text-muted-foreground">Resta no orçamento</dt>
              <dd className={remaining < 0 ? 'text-headline tabular-nums text-destructive' : 'text-headline tabular-nums'}>
                {formatCurrency(remaining)}
              </dd>
            </div>
            <div>
              <dt className="text-footnote text-muted-foreground">Livre por dia</dt>
              <dd className="text-headline tabular-nums">{formatCurrency(freePerDay(remaining, month))}</dd>
            </div>
          </dl>
        </>
      ) : (
        <button type="button" onClick={() => setEditing(true)} className="text-body text-tint">
          Definir orçamento do mês
        </button>
      )}
      <BudgetSheet open={editing} onOpenChange={setEditing} month={month} current={budget} />
    </section>
  )
}
