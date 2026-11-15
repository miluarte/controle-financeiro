'use client'

import { AltArrowLeftLinearIcon, AltArrowRightLinearIcon } from '@solar-icons/react'
import { addMonths, capitalize, monthName } from '@/lib/utils'

// Troca a fatura exibida (anterior, atual, próximas).
export function InvoiceNavigator({ value, onChange, caption }: { value: string; onChange: (ref: string) => void; caption?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <button type="button" aria-label="Fatura anterior" onClick={() => onChange(addMonths(value, -1))}
        className="glass flex size-11 items-center justify-center rounded-full active:scale-95">
        <AltArrowLeftLinearIcon className="size-5" />
      </button>
      <div className="min-w-0 text-center">
        <p className="text-headline">Fatura de {capitalize(monthName(value))}</p>
        {caption && <p className="truncate text-footnote text-muted-foreground">{caption}</p>}
      </div>
      <button type="button" aria-label="Próxima fatura" onClick={() => onChange(addMonths(value, 1))}
        className="glass flex size-11 items-center justify-center rounded-full active:scale-95">
        <AltArrowRightLinearIcon className="size-5" />
      </button>
    </div>
  )
}
