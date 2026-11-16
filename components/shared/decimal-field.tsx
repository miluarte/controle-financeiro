'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'

interface DecimalFieldProps {
  id?: string
  value: number
  onChange: (value: number) => void
  decimals?: number
  className?: string
}

// Número com vírgula (km por litro, quilômetros). Deixa apagar enquanto digita, como o NumberField.
export function DecimalField({ id, value, onChange, decimals = 1, className }: DecimalFieldProps) {
  const format = (n: number) => (n ? n.toLocaleString('pt-BR', { maximumFractionDigits: decimals }) : '')
  const [text, setText] = useState(format(value))
  const [editing, setEditing] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const clean = e.target.value.replace(/[^\d,]/g, '').replace(/,(?=.*,)/g, '')
    setText(clean)
    const n = Number(clean.replace(',', '.'))
    onChange(Number.isFinite(n) ? Number(n.toFixed(decimals)) : 0)
  }

  return (
    <Input
      id={id}
      type="text"
      inputMode="decimal"
      variant="bare"
      placeholder="0"
      value={editing ? text : format(value)}
      onFocus={e => { setEditing(true); setText(format(value)); e.target.select() }}
      onChange={handleChange}
      onBlur={() => setEditing(false)}
      className={className}
    />
  )
}
