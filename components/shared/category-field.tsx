'use client'

import { useState } from 'react'
import { FormRow } from '@/components/ios/form-row'
import { CategoryPickerSheet } from '@/components/categories/category-picker-sheet'
import type { Category } from '@/lib/types'
import { CategoryIcon } from './category-icon'
import { PickerValue } from './picker-value'

// Categoria numa linha do formulário (rótulo | ícone + escolhida); tocar abre a folha em acordeão.
export function CategoryField({ categories, value, onChange, id = 'category-field', placeholder = 'Escolher' }: {
  categories: Category[]
  value: string | null
  onChange: (id: string | null) => void
  id?: string
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const current = categories.find(c => c.id === value)
  const type = current?.type ?? categories[0]?.type ?? 'expense'
  return (
    <>
      <FormRow label="Categoria" htmlFor={id}>
        <PickerValue id={id} onClick={() => setOpen(true)} placeholder={placeholder}
          icon={current && <CategoryIcon active icon={current.icon} size="sm" />} label={current?.name} />
      </FormRow>
      <CategoryPickerSheet open={open} onOpenChange={setOpen} categories={categories} type={type}
        value={value} onSelect={onChange} />
    </>
  )
}
