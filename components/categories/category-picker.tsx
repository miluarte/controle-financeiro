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
  const { categories, loading } = useCategories()
  const filtered = type ? categories.filter(c => c.type === type) : categories

  // Nunca passa `undefined` pro Select (isso o deixaria descontrolado no
  // primeiro render e depois controlado quando `value` chegasse, o que o
  // Base UI não suporta).
  const selected = value ?? ''

  // O Select só resolve o nome exibido a partir de `items`. Sem isso, um
  // valor definido programaticamente (vindo de dados existentes, por
  // exemplo) aparece como o id cru em vez do nome da categoria.
  const items = Object.fromEntries(filtered.map(cat => [cat.id, cat.name]))

  return (
    <Select value={selected} onValueChange={onChange} items={items}>
      <SelectTrigger>
        <SelectValue placeholder={loading ? 'Carregando...' : 'Selecionar categoria'} />
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
