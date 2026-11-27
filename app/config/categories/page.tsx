'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CategoryAccordion } from '@/components/categories/category-accordion'
import { LargeTitleHeader } from '@/components/ios/large-title-header'
import { SearchField } from '@/components/ios/search-field'
import { SegmentedControl } from '@/components/ios/segmented-control'
import { Note } from '@/components/shared/note'
import { useCategories } from '@/hooks/use-categories'
import type { CategoryType } from '@/lib/types'

// Categorias universais (iguais para todos, sem edição): principais e subcategorias em acordeão,
// em ordem alfabética. ?tipo=receita abre na aba de receita.
export default function CategoriesPage() {
  return <Suspense><Categories /></Suspense>
}

function Categories() {
  const params = useSearchParams()
  const { categories } = useCategories()
  const [type, setType] = useState<CategoryType>(params.get('tipo') === 'receita' ? 'income' : 'expense')
  const [query, setQuery] = useState('')

  return (
    <>
      <LargeTitleHeader title="Categorias" />
      <div className="space-y-5 px-4 pt-2">
        <SegmentedControl aria-label="Tipo" value={type} onChange={setType}
          options={[{ value: 'expense', label: 'Gastos' }, { value: 'income', label: 'Receitas' }]} />
        <SearchField placeholder="Buscar" value={query} onChange={e => setQuery(e.target.value)} />
        <CategoryAccordion categories={categories} type={type} query={query} />
        <Note>As categorias são as mesmas para todos.</Note>
      </div>
    </>
  )
}
