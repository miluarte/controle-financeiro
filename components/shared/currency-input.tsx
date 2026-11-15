'use client'

import type { VariantProps } from 'class-variance-authority'
import { Input, inputVariants } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils'

interface CurrencyInputProps {
  id?: string
  value: number
  onChange: (cents: number) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  variant?: VariantProps<typeof inputVariants>['variant']
  autoFocus?: boolean
  'aria-label'?: string
}

// Input controlado inteiramente em centavos: o usuário digita números,
// a exibição é formatada como moeda, e o valor que sai em onChange nunca
// é decimal — mantém a regra de "valores monetários sempre em centavos".
export function CurrencyInput({ id, value, onChange, placeholder, className, disabled, variant, autoFocus, ...rest }: CurrencyInputProps) {
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
      variant={variant}
      autoFocus={autoFocus}
      aria-label={rest['aria-label']}
    />
  )
}
