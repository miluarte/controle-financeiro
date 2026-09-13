'use client'

import { useCategories } from '@/hooks/use-categories'
import { TokenIcon } from '@/components/shared/token-icon'

export function CategoryBadge() {
  const { categories, loading, error } = useCategories()

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>
  if (error) return <p className="text-sm text-destructive">{error}</p>

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map(cat => (
        <div
          key={cat.id}
          className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-sm"
        >
          <TokenIcon icon={cat.icon} color={cat.color} size="sm" />
          <span>{cat.name}</span>
        </div>
      ))}
    </div>
  )
}
