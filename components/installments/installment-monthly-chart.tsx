'use client'

import { useMemo } from 'react'
import { useInstallments } from '@/hooks/use-installments'
import { formatCurrency } from '@/lib/utils'

function addMonths(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setMonth(d.getMonth() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(ym: string): string {
  const [year, month] = ym.split('-')
  const names = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${names[parseInt(month) - 1]} ${year.slice(2)}`
}

function currentYM(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function InstallmentMonthlyChart() {
  const { groups, loading } = useInstallments()

  const monthlyTotals = useMemo(() => {
    const totals: Record<string, number> = {}

    for (const group of groups) {
      if (group.status !== 'active') continue

      const remaining = group.installmentCount - group.paidCount
      if (remaining <= 0) continue

      // primeira parcela não paga = startDate + paidCount meses
      for (let i = 0; i < remaining; i++) {
        const ym = addMonths(group.startDate, group.paidCount + i)
        totals[ym] = (totals[ym] ?? 0) + group.installmentAmount
      }
    }

    return totals
  }, [groups])

  const months = useMemo(() => {
    const keys = Object.keys(monthlyTotals).sort()
    if (keys.length === 0) return []
    return keys
  }, [monthlyTotals])

  if (loading || months.length === 0) return null

  const maxValue = Math.max(...months.map(m => monthlyTotals[m]))
  const today = currentYM()
  const BAR_MAX_H = 80 // px

  return (
    <div className="mb-4 overflow-x-auto rounded-xl border bg-card p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Parcelas por mês
      </p>
      <div className="flex items-end gap-3">
        {months.map(ym => {
          const value = monthlyTotals[ym]
          const barH = Math.max(8, Math.round((value / maxValue) * BAR_MAX_H))
          const isToday = ym === today

          return (
            <div key={ym} className="flex min-w-[48px] flex-col items-center gap-1">
              <span className="text-[10px] font-medium leading-none text-foreground">
                {formatCurrency(value)}
              </span>
              <div
                className={`w-10 rounded-t-md transition-all ${isToday ? 'bg-primary' : 'bg-primary/30'}`}
                style={{ height: barH }}
              />
              <span className={`text-[10px] leading-none ${isToday ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
                {monthLabel(ym)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
