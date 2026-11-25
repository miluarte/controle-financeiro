'use client'

import { useState } from 'react'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { ProgressBar, toneFor } from '@/components/shared/progress-bar'
import { CategoryIcon } from '@/components/shared/category-icon'
import { useCategories } from '@/hooks/use-categories'
import { useCategorySpending } from '@/hooks/use-data'
import type { CategorySpending } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { GoalSheet } from './goal-sheet'
import { Money } from '@/components/shared/money'
import { EmptyState } from '@/components/shared/empty-state'

// ANA-6: gastos por categoria com percentual e meta. ANA-5: categorias sem gasto, recolhidas.
export function CategoryBreakdown({ month }: { month: string }) {
  const { rows } = useCategorySpending(month)
  const { categories } = useCategories()
  const [editing, setEditing] = useState<CategorySpending | null>(null)
  const catById = new Map(categories.map(c => [c.id, c]))
  const active = rows.filter(r => catById.has(r.categoryId))
  const spent = active.filter(r => r.total > 0)
  const empty = active.filter(r => r.total === 0)
  const total = spent.reduce((s, r) => s + r.total, 0)

  const row = (r: CategorySpending) => {
    const c = catById.get(r.categoryId)
    const share = total ? Math.round((r.total / total) * 100) : 0
    const ratio = r.goal ? r.total / r.goal : 0
    return (
      <ListRow
        key={r.categoryId}
        onClick={() => setEditing(r)}
        leading={<CategoryIcon icon={c?.icon ?? 'ellipsis'} />}
        title={r.name}
        subtitle={
          r.goal ? (
            <span className="block space-y-1 pt-1">
              <ProgressBar value={ratio} tone={toneFor(ratio)} className="h-1.5" />
              <span className="block truncate">{Math.round(ratio * 100)}% da meta de {formatCurrency(r.goal)}</span>
            </span>
          ) : r.total > 0 ? `${share}% dos gastos · sem meta` : 'Sem meta'
        }
        trailing={<Money cents={r.total} />}
      />
    )
  }

  return (
    <div className="space-y-5">
      <ListGroup header="Por categoria" >
        {spent.length ? spent.map(row) : (
          <EmptyState>Nenhum gasto neste mês.</EmptyState>
        )}
      </ListGroup>
      {empty.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer list-none px-4 text-footnote uppercase text-muted-foreground">
            Sem gasto no mês · {empty.length} <span className="text-tint group-open:hidden">mostrar</span>
          </summary>
          <ListGroup className="mt-1.5">{empty.map(row)}</ListGroup>
        </details>
      )}
      <GoalSheet row={editing} month={month} onClose={() => setEditing(null)} />
    </div>
  )
}
