'use client'

import { useCategories } from '@/hooks/use-categories'
import { Badge } from '@/components/ui/badge'

export function CategoryBadge() {
  const { categories, loading, error } = useCategories()

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>
  if (error) return <p className="text-sm text-destructive">{error}</p>

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map(cat => (
        <Badge key={cat.id} variant="outline">
          {cat.name}
        </Badge>
      ))}
    </div>
  )
}
