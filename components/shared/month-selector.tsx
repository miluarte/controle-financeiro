'use client'

import { AltArrowLeftBoldDuotoneIcon, AltArrowRightBoldDuotoneIcon } from '@solar-icons/react'
import { useMonth } from '@/hooks/use-month'
import { addMonths, currentMonth, monthName } from '@/lib/utils'

// NAV-2: seletor de mês em cápsula de vidro. Mostra o ano quando não é o ano atual.
export function MonthSelector() {
  const { month, setMonth } = useMonth()
  const sameYear = month.slice(0, 4) === currentMonth().slice(0, 4)
  const label = monthName(month, 'short').toUpperCase() + (sameYear ? '' : ` ${month.slice(2, 4)}`)

  return (
    <div className="glass flex h-11 items-center rounded-full px-1">
      <button type="button" aria-label="Mês anterior" onClick={() => setMonth(addMonths(month, -1))}
        className="flex size-9 items-center justify-center rounded-full active:bg-fill">
        <AltArrowLeftBoldDuotoneIcon className="size-5" />
      </button>
      <button type="button" onClick={() => setMonth(currentMonth())} aria-label="Voltar para o mês atual"
        className="min-w-12 text-center text-subheadline font-semibold tabular-nums">
        {label}
      </button>
      <button type="button" aria-label="Próximo mês" onClick={() => setMonth(addMonths(month, 1))}
        className="flex size-9 items-center justify-center rounded-full active:bg-fill">
        <AltArrowRightBoldDuotoneIcon className="size-5" />
      </button>
    </div>
  )
}
