'use client'

import { PickerRow } from './picker-row'
import type { Category } from '@/lib/types'

// Categoria numa linha (seletor nativo), com o ícone e a cor da escolhida.
export function CategoryField({ categories, value, onChange, id = 'category-field', placeholder = 'Escolher' }: {
  categories: Category[]
  value: string | null
  onChange: (id: string | null) => void
  id?: string
  placeholder?: string
}) {
  return (
    <PickerRow id={id} label="Categoria" value={value} onChange={v => onChange(v || null)} placeholder={placeholder}
      options={categories.map(c => ({ value: c.id, label: c.name, icon: c.icon, color: c.color }))} />
  )
}
