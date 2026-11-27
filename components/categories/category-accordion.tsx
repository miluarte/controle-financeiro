'use client'

import { useState } from 'react'
import { AltArrowDownLinearIcon, CheckCircleBoldIcon } from '@solar-icons/react'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { CategoryIcon } from '@/components/shared/category-icon'
import { EmptyState } from '@/components/shared/empty-state'
import { categoryTree } from '@/lib/categories'
import { normalizeSearch } from '@/lib/search'
import type { Category, CategoryType } from '@/lib/types'
import { cn } from '@/lib/utils'

// Categorias em acordeão: cada principal abre as subcategorias embaixo. Principais e subcategorias
// em ordem alfabética; a própria principal vem primeiro no grupo (escolher ela grava só a principal).
// Com onSelect, a escolhida mostra o ícone preenchido e a marca; o grupo dela já abre aberto.
// Com busca, mostra só o que combina, com os grupos abertos.
export function CategoryAccordion({ categories, type, value, onSelect, query = '' }: {
  categories: Category[]
  type: CategoryType
  value?: string | null
  onSelect?: (id: string) => void
  query?: string
}) {
  const tree = categoryTree(categories, type)
  const chosenRoot = tree.find(g => g.parent.id === value || g.children.some(c => c.id === value))?.parent.id
  const [open, setOpen] = useState<Set<string>>(() => new Set(chosenRoot ? [chosenRoot] : []))
  const toggle = (id: string) => setOpen(s => {
    const next = new Set(s)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  const q = normalizeSearch(query)
  const hit = (c: Category) => normalizeSearch(c.name).includes(q)
  const groups = q
    ? tree.map(g => ({ ...g, children: hit(g.parent) ? g.children : g.children.filter(hit) }))
      .filter(g => hit(g.parent) || g.children.length)
    : tree

  if (!groups.length) return <ListGroup><EmptyState>Nenhuma categoria encontrada.</EmptyState></ListGroup>

  const option = (c: Category, sub: boolean) => {
    const selected = c.id === value
    return (
      <ListRow key={`${sub ? 'sub' : 'all'}-${c.id}`} onClick={onSelect ? () => onSelect(c.id) : undefined}
        className={sub ? 'pl-8' : undefined}
        leading={<CategoryIcon icon={c.icon} size="sm" active={selected} />}
        title={c.name}
        trailing={selected ? <CheckCircleBoldIcon className="size-5 text-tint" /> : undefined} />
    )
  }

  return (
    <ListGroup>
      {groups.map(({ parent, children }) => {
        const expanded = !!q || open.has(parent.id)
        return [
          <ListRow key={parent.id} onClick={() => toggle(parent.id)}
            leading={<CategoryIcon icon={parent.icon} active={expanded} />}
            title={parent.name}
            trailing={<AltArrowDownLinearIcon className={cn('size-4 stroke-(length:--icon-stroke-chevron) transition-transform', expanded && 'rotate-180')} />} />,
          ...(expanded ? [
            ...(onSelect && (!q || hit(parent)) ? [option(parent, true)] : []),
            ...children.map(c => option(c, true)),
          ] : []),
        ]
      })}
    </ListGroup>
  )
}
