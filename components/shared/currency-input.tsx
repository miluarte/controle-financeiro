'use client'

import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils'

interface CurrencyInputProps {
  id?: string
  value: number
  onChange: (cents: number) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

// Input controlado inteiramente em centavos: o usuário digita números,
// a exibição é formatada como moeda, e o valor que sai em onChange nunca
// é decimal — mantém a regra de "valores monetários sempre em centavos".
export function CurrencyInput({ id, value, onChange, placeholder, className, disabled }: CurrencyInputProps) {
  const display = value ? formatCurrency(value) : ''

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '')
    onChange(digits ? Number(digits) : 0)
  }

  return (
    <Input
      id={id}
      inputMode="numeric"
      placeholder={placeholder ?? 'R$ 0,00'}
      value={display}
      onChange={handleChange}
      className={className}
      disabled={disabled}
    />
  )
}
