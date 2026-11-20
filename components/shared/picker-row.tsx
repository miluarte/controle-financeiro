'use client'

import { FormRow } from '@/components/ios/form-row'
import { SelectField } from './select-field'
import { TokenIcon } from './token-icon'

export interface PickerOption { value: string; label: string; icon?: string; color?: string }

// Escolha única numa linha de formulário (rótulo | ícone + valor), com o seletor nativo do iPhone.
// Substitui as listas de chips de categoria, carteira e cartão para economizar espaço.
export function PickerRow({ id, label, value, onChange, options, placeholder = 'Escolher' }: {
  id: string
  label: React.ReactNode
  value: string | null
  onChange: (value: string) => void
  options: PickerOption[]
  placeholder?: string
}) {
  const current = options.find(o => o.value === value)
  return (
    <FormRow label={label} htmlFor={id}>
      <span className="flex min-w-0 items-center gap-2">
        {current?.icon && <TokenIcon active icon={current.icon} color={current.color ?? 'gray'} size="sm" />}
        <SelectField id={id} value={value ?? ''} onChange={onChange} placeholder={placeholder}
          options={options.map(o => ({ value: o.value, label: o.label }))} className="min-w-0 truncate" />
      </span>
    </FormRow>
  )
}
