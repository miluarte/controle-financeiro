'use client'

import { cn } from '@/lib/utils'

// Escolha numa lista com o seletor nativo do iPhone (roda), mostrando só o texto escolhido.
interface SelectFieldProps {
  id?: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  className?: string
}

export function SelectField({ id, value, onChange, options, placeholder = 'Escolher', className }: SelectFieldProps) {
  const current = options.find(o => o.value === value)
  return (
    <span className={cn('relative inline-flex h-row items-center justify-end text-body text-tint', className)}>
      <span className={cn(!current && 'text-muted-foreground')}>{current?.label ?? placeholder}</span>
      <select id={id} value={value} onChange={e => onChange(e.target.value)}
        className="absolute inset-0 size-full cursor-pointer opacity-0">
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </span>
  )
}
