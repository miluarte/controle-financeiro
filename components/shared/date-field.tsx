'use client'

import { cn, monthName } from '@/lib/utils'

// Campo de data ou mês com texto em português e meses abreviados ("16 nov 2026", "nov 2026").
// O seletor nativo do iPhone fica por cima, invisível: tocar no texto abre a roda de datas.
interface DateFieldProps {
  id?: string
  value: string // AAAA-MM-DD (date) ou AAAA-MM (month); vazio = sem valor
  onChange: (value: string) => void
  mode?: 'date' | 'month'
  min?: string
  disabled?: boolean
  placeholder?: string
  className?: string
}

function label(value: string, mode: 'date' | 'month') {
  if (!value) return null
  const month = monthName(value.slice(0, 7), 'short')
  const year = value.slice(0, 4)
  return mode === 'month' ? `${month} ${year}` : `${Number(value.slice(8, 10))} ${month} ${year}`
}

export function DateField({ id, value, onChange, mode = 'date', min, disabled, placeholder = 'Escolher', className }: DateFieldProps) {
  const text = label(value, mode)
  return (
    <span className={cn('relative inline-flex h-row items-center justify-end text-body', disabled ? 'text-muted-foreground' : 'text-tint', className)}>
      <span className={cn(!text && 'text-muted-foreground')}>{text ?? placeholder}</span>
      <input
        id={id}
        type={mode}
        value={value}
        min={min}
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
        className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-default"
      />
    </span>
  )
}
