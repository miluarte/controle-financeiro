'use client'

import { useState } from 'react'
import { AltArrowDownLinearIcon } from '@solar-icons/react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useFinePointer } from '@/hooks/use-fine-pointer'
import { useMonth } from '@/hooks/use-month'
import { capitalize, currentMonth, monthName } from '@/lib/utils'
import { MonthGrid } from './month-grid'

const CAPSULE = 'glass relative flex h-11 cursor-pointer items-center gap-1 rounded-full pr-3 pl-4 text-subheadline font-semibold active:scale-95'

// NAV-2: mês em cápsula de vidro ("Novembro ⌄"). No iPhone, tocar abre a roda de mês e ano;
// no desktop, abre uma grade de meses. Mostra o ano só quando não é o ano atual.
export function MonthSelector() {
  const { month, setMonth } = useMonth()
  const fine = useFinePointer()
  const [open, setOpen] = useState(false)
  const sameYear = month.slice(0, 4) === currentMonth().slice(0, 4)
  const label = capitalize(monthName(month)) + (sameYear ? '' : ` ${month.slice(0, 4)}`)

  if (fine) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger className={CAPSULE} aria-label="Escolher mês">
          {label}<AltArrowDownLinearIcon className="size-4" />
        </PopoverTrigger>
        <PopoverContent>
          <MonthGrid value={month} onChange={m => { setMonth(m); setOpen(false) }} />
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <label className={CAPSULE}>
      {label}
      <AltArrowDownLinearIcon className="size-4" />
      <input type="month" aria-label="Escolher mês" value={month}
        onChange={e => setMonth(e.target.value || currentMonth())}
        className="absolute inset-0 size-full cursor-pointer opacity-0" />
    </label>
  )
}
