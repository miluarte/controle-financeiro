'use client'

import { ChoiceChip } from '@/components/shared/choice-chip'
import { daysInMonth, todayIso } from '@/lib/utils'

// Dias do mês para marcar quando a assinatura foi usada. Dias futuros ficam desativados.
export function UseCalendar({ month, used, onToggle }: {
  month: string; used: Set<string>; onToggle: (date: string, used: boolean) => void
}) {
  const today = todayIso()
  const days = Array.from({ length: daysInMonth(month) }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)
  return (
    <div className="grid grid-cols-7 gap-1.5 p-3">
      {days.map(d => {
        const on = used.has(d)
        return (
          <ChoiceChip key={d} size="sm" selected={on} disabled={d > today} aria-pressed={on}
            onClick={() => onToggle(d, !on)} className="justify-center px-0 tabular-nums">
            {Number(d.slice(8))}
          </ChoiceChip>
        )
      })}
    </div>
  )
}
