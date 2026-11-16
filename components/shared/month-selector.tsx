'use client'

import { AltArrowDownLinearIcon } from '@solar-icons/react'
import { useMonth } from '@/hooks/use-month'
import { capitalize, currentMonth, monthName } from '@/lib/utils'

// NAV-2: mês em cápsula de vidro ("Novembro ⌄"). Tocar abre a roda de mês e ano do iPhone.
// Mostra o ano só quando não é o ano atual.
export function MonthSelector() {
  const { month, setMonth } = useMonth()
  const sameYear = month.slice(0, 4) === currentMonth().slice(0, 4)
  const label = capitalize(monthName(month)) + (sameYear ? '' : ` ${month.slice(0, 4)}`)

  return (
    <label className="glass relative flex h-11 cursor-pointer items-center gap-1 rounded-full pr-3 pl-4 text-subheadline font-semibold active:scale-95">
      {label}
      <AltArrowDownLinearIcon className="size-4" />
      <input type="month" aria-label="Escolher mês" value={month}
        onChange={e => setMonth(e.target.value || currentMonth())}
        className="absolute inset-0 size-full cursor-pointer opacity-0" />
    </label>
  )
}
