'use client'

import { useCategories } from '@/hooks/use-categories'
import type { CategoryType } from '@/lib/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface CategoryPickerProps {
  type?: CategoryType
  value?: string
  onChange?: (value: string | null) => void
}

export function CategoryPicker({ type, value, onChange }: CategoryPickerProps) {
  const { categories } = useCategories()
  const filtered = type ? categories.filter(c => c.type === type) : categories

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Selecionar categoria" />
      </SelectTrigger>
      <SelectContent>
        {filtered.map(cat => (
          <SelectItem key={cat.id} value={cat.id}>
            {cat.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
