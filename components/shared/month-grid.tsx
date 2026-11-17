'use client'

import { useState } from 'react'
import { AltArrowLeftLinearIcon, AltArrowRightLinearIcon } from '@solar-icons/react'
import { Button } from '@/components/ui/button'
import { capitalize, cn, monthName } from '@/lib/utils'

// Grade de meses com troca de ano, para escolher mês no desktop (navegadores sem seletor de mês).
export function MonthGrid({ value, onChange, min }: { value: string; onChange: (month: string) => void; min?: string }) {
  const [year, setYear] = useState(Number((value || min || new Date().toISOString()).slice(0, 4)))
  const minMonth = min?.slice(0, 7)
  return (
    <div className="w-64 space-y-2">
      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" size="icon" aria-label="Ano anterior" onClick={() => setYear(y => y - 1)}
          disabled={!!minMonth && year <= Number(minMonth.slice(0, 4))}>
          <AltArrowLeftLinearIcon />
        </Button>
        <span className="text-headline font-semibold tabular-nums">{year}</span>
        <Button type="button" variant="ghost" size="icon" aria-label="Próximo ano" onClick={() => setYear(y => y + 1)}>
          <AltArrowRightLinearIcon />
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {Array.from({ length: 12 }, (_, i) => {
          const month = `${year}-${String(i + 1).padStart(2, '0')}`
          const selected = month === value?.slice(0, 7)
          return (
            <Button key={month} type="button" variant={selected ? 'default' : 'ghost'} size="sm"
              disabled={!!minMonth && month < minMonth}
              className={cn('rounded-full', !selected && 'font-normal')}
              onClick={() => onChange(month)}>
              {capitalize(monthName(month, 'short'))}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
