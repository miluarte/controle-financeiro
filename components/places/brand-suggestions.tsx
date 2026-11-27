'use client'

import { ListRow } from '@/components/ios/list-row'
import { placeKey } from '@/lib/places'

// Marcas já usadas que batem com o que está sendo digitado (sem maiúsculas e acentos), como na busca.
// Tocar escolhe a marca, para lojas do mesmo negócio ficarem sempre com o mesmo nome.
export function BrandSuggestions({ brands, query, onPick }: {
  brands: string[]
  query: string
  onPick: (brand: string) => void
}) {
  const q = query.trim() ? placeKey(query) : ''
  if (!q) return null
  const matches = brands
    .filter(b => placeKey(b) !== q && placeKey(b).includes(q))
    .sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))
    .slice(0, 5)
  return <>{matches.map(b => <ListRow key={b} tone="tint" title={b} onClick={() => onPick(b)} />)}</>
}
