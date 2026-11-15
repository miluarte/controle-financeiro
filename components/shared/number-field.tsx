'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'

interface NumberFieldProps {
  id?: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  className?: string
}

// Campo de número inteiro (dia, parcelas). Deixa apagar tudo enquanto digita;
// o mínimo e o máximo só são aplicados ao sair do campo.
export function NumberField({ id, value, onChange, min = 0, max = Infinity, className }: NumberFieldProps) {
  const [text, setText] = useState(String(value))
  const [editing, setEditing] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, String(Math.min(max, 9999)).length)
    setText(digits)
    if (digits) onChange(Math.min(max, Number(digits)))
  }

  function handleBlur() {
    setEditing(false)
    const n = Math.min(max, Math.max(min, Number(text) || min))
    setText(String(n))
    onChange(n)
  }

  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      variant="bare"
      value={editing ? text : String(value)}
      onFocus={e => { setEditing(true); setText(String(value)); e.target.select() }}
      onChange={handleChange}
      onBlur={handleBlur}
      className={className}
    />
  )
}
