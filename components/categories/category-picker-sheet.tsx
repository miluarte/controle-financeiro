'use client'

import { useState } from 'react'
import { ModalSheet } from '@/components/ios/modal-sheet'
import { SearchField } from '@/components/ios/search-field'
import type { Category, CategoryType } from '@/lib/types'
import { CategoryAccordion } from './category-accordion'

// Folha "Categorias": busca no topo e as categorias em acordeão. Tocar numa opção escolhe e fecha.
export function CategoryPickerSheet({ open, onOpenChange, categories, type, value, onSelect }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: Category[]
  type: CategoryType
  value: string | null
  onSelect: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  return (
    <ModalSheet open={open} onOpenChange={o => { onOpenChange(o); if (!o) setQuery('') }} title="Categorias">
      <SearchField placeholder="Buscar" value={query} onChange={e => setQuery(e.target.value)} />
      <CategoryAccordion key={String(open)} categories={categories} type={type} value={value} query={query}
        onSelect={id => { onSelect(id); onOpenChange(false); setQuery('') }} />
    </ModalSheet>
  )
}
