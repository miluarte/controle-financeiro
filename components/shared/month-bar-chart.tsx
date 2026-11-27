'use client'

import { cva } from 'class-variance-authority'
import { cn, monthName } from '@/lib/utils'

// Gráfico de barras por mês: uma barra por mês, a do mês escolhido na cor principal e as outras
// no tom claro dela. Tocar numa barra escolhe o mês. Sem números: o valor fica fora do gráfico.
const barVariants = cva('w-full rounded-lg transition-colors', {
  variants: { selected: { true: 'bg-primary', false: 'bg-primary/(--alpha-soft)' } },
  defaultVariants: { selected: false },
})
const labelVariants = cva('text-caption2 font-bold uppercase', {
  variants: { selected: { true: 'text-foreground', false: 'text-muted-foreground' } },
  defaultVariants: { selected: false },
})

interface MonthBarChartProps {
  months: { month: string; total: number }[]
  value: string
  onChange: (month: string) => void
  className?: string
}

// "set 25"
const label = (m: string) => `${monthName(m, 'short')} ${m.slice(2, 4)}`

export function MonthBarChart({ months, value, onChange, className }: MonthBarChartProps) {
  const max = Math.max(...months.map(m => m.total), 1)
  return (
    <div role="radiogroup" aria-label="Mês" className={cn('flex gap-1.5', className)}>
      {months.map(m => {
        const selected = m.month === value
        return (
          <button key={m.month} type="button" role="radio" aria-checked={selected}
            aria-label={`${monthName(m.month)} de ${m.month.slice(0, 4)}`}
            onClick={() => onChange(m.month)}
            className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <span className="flex h-24 w-full items-end">
              {/* altura proporcional ao maior mês; mês sem gasto fica com um traço */}
              <span className={cn(barVariants({ selected }), 'min-h-1')} style={{ height: `${(m.total / max) * 100}%` }} />
            </span>
            <span className={labelVariants({ selected })}>{label(m.month)}</span>
          </button>
        )
      })}
    </div>
  )
}
