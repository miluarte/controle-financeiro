'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ProgressBar, toneFor } from '@/components/shared/progress-bar'
import { averagePerDay, freePerDay, paceStatus, type Pace } from '@/lib/analysis'
import { formatCurrency } from '@/lib/utils'
import { BudgetSheet } from './budget-sheet'
import { PaceSparkline } from './pace-sparkline'

const PACE_LABEL: Record<Pace, { text: string; variant: 'success' | 'secondary' | 'destructive' }> = {
  below: { text: 'Abaixo do ritmo', variant: 'success' },
  on: { text: 'No ritmo', variant: 'secondary' },
  above: { text: 'Acima do ritmo', variant: 'destructive' },
}

// ANA-1, ANA-2 e ANA-3 num card só: gasto contra o orçamento, ritmo do mês, quanto resta,
// livre por dia e média por dia.
export function BudgetCard({ month, spent, budget, cumulative, day }: {
  month: string; spent: number; budget: number | null; cumulative: number[]; day: number
}) {
  const [editing, setEditing] = useState(false)
  const ratio = budget ? spent / budget : 0
  const remaining = (budget ?? 0) - spent
  const days = cumulative.length
  const realToday = day > 0 ? cumulative[day - 1] : 0
  const pace = budget ? PACE_LABEL[paceStatus(realToday, budget, day, days)] : null

  const stats = [
    ...(budget ? [
      { label: 'Resta', value: formatCurrency(remaining), danger: remaining < 0 },
      { label: 'Livre por dia', value: formatCurrency(freePerDay(remaining, month)), danger: false },
    ] : []),
    ...(day > 0 ? [{ label: 'Média por dia', value: formatCurrency(averagePerDay(cumulative, day)), danger: false }] : []),
  ]

  return (
    <section className="space-y-3 rounded-3xl bg-grouped p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-subheadline text-muted-foreground">Gasto no mês</p>
          <p className="text-title1 font-bold tabular-nums">{formatCurrency(spent)}</p>
        </div>
        {budget ? <Button variant="plain" size="nav" className="-mr-2" onClick={() => setEditing(true)}>Editar</Button> : null}
      </div>

      {budget ? (
        <>
          <ProgressBar value={ratio} tone={toneFor(ratio)} />
          <div className="flex items-center justify-between gap-2">
            <p className="text-footnote text-muted-foreground">{Math.round(ratio * 100)}% de {formatCurrency(budget)}</p>
            {pace && day > 0 && <Badge variant={pace.variant}>{pace.text}</Badge>}
          </div>
          {day > 0 && (
            <div className="space-y-1">
              <PaceSparkline cumulative={cumulative} budget={budget} day={day} />
              <p className="text-footnote text-muted-foreground">
                Até hoje {formatCurrency(realToday)} · ideal {formatCurrency(Math.round((budget * day) / days))}
              </p>
            </div>
          )}
        </>
      ) : (
        <button type="button" onClick={() => setEditing(true)} className="text-body text-tint">
          Definir orçamento do mês
        </button>
      )}

      {stats.length > 0 && (
        <dl className="grid grid-cols-3 gap-2 border-t border-separator pt-3">
          {stats.map(s => (
            <div key={s.label}>
              <dt className="text-footnote text-muted-foreground">{s.label}</dt>
              <dd className={s.danger ? 'text-headline tabular-nums text-destructive' : 'text-headline tabular-nums'}>{s.value}</dd>
            </div>
          ))}
        </dl>
      )}
      <BudgetSheet open={editing} onOpenChange={setEditing} month={month} current={budget} />
    </section>
  )
}
