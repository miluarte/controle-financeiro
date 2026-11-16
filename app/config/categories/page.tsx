'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CategoryFormSheet } from '@/components/categories/category-form-sheet'
import { LargeTitleHeader } from '@/components/ios/large-title-header'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { SegmentedControl } from '@/components/ios/segmented-control'
import { TokenIcon } from '@/components/shared/token-icon'
import { useAllCategories, useCategoryUsage } from '@/hooks/use-data'
import { useRefresh } from '@/hooks/use-refresh'
import { categoriesApi } from '@/lib/api/categories'
import type { Category, CategoryType } from '@/lib/types'

const CLASS_LABEL = { essential: 'Essencial', desire: 'Desejo' } as const

// CAT-1 a CAT-5: organizar categorias de gasto e de receita. ?tipo=receita abre na aba de receita.
export default function CategoriesPage() {
  return <Suspense><Categories /></Suspense>
}

function Categories() {
  const params = useSearchParams()
  const { categories } = useAllCategories()
  const usage = useCategoryUsage()
  const refresh = useRefresh()
  const [type, setType] = useState<CategoryType>(params.get('tipo') === 'receita' ? 'income' : 'expense')
  const [newName, setNewName] = useState('')
  const [editing, setEditing] = useState<Category | null>(null)
  const [error, setError] = useState<string | null>(null)

  const ofType = categories.filter(c => c.type === type)
  const active = ofType.filter(c => c.active)
  const archived = ofType.filter(c => !c.active)

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    setError(null)
    try {
      await categoriesApi.create(
        { type, name, icon: 'ellipsis', color: 'gray', class: type === 'expense' ? 'desire' : null },
        active.length,
      )
      setNewName('')
      await refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      setError(msg.includes('duplicate') ? 'Já existe uma categoria com esse nome.' : msg || 'Não foi possível adicionar.')
    }
  }

  const row = (c: Category) => {
    const n = usage.get(c.id) ?? 0
    const parts = [n ? `${n} ${n === 1 ? 'lançamento' : 'lançamentos'}` : 'Sem lançamentos']
    if (c.class) parts.push(CLASS_LABEL[c.class])
    return (
      <ListRow key={c.id} onClick={() => setEditing(c)}
        leading={<TokenIcon icon={c.icon} color={c.color} />}
        title={c.active ? c.name : <span className="text-muted-foreground">{c.name}</span>}
        subtitle={parts.join(' · ')} chevron />
    )
  }

  return (
    <>
      <LargeTitleHeader back title="Categorias" />
      <div className="space-y-7 px-4 pt-2">
        <SegmentedControl aria-label="Tipo" value={type} onChange={setType}
          options={[{ value: 'expense', label: 'Gastos' }, { value: 'income', label: 'Receitas' }]} />

        <form onSubmit={add}>
          <ListGroup footer={error ?? undefined}>
            <li className="flex items-center gap-2 py-1.5 pr-1.5 pl-4">
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nova categoria"
                className="h-row min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-muted-foreground" />
              <Button type="submit" size="sm" disabled={!newName.trim()} className="rounded-full">Adicionar</Button>
            </li>
          </ListGroup>
        </form>

        <ListGroup header={`Ativas · ${active.length}`}>{active.map(row)}</ListGroup>
        {archived.length > 0 && <ListGroup header="Arquivadas">{archived.map(row)}</ListGroup>}
      </div>
      <CategoryFormSheet category={editing} siblings={editing ? active : []} onClose={() => setEditing(null)} />
    </>
  )
}
