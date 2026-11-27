'use client'

import { useState } from 'react'
import { LargeTitleHeader } from '@/components/ios/large-title-header'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { useConfirmDelete } from '@/components/ios/use-delete-action'
import { PlaceSheet, type PlaceTarget } from '@/components/places/place-sheet'
import { EmptyState } from '@/components/shared/empty-state'
import { LoadingBlock } from '@/components/shared/loading-dots'
import { placeTitle, usePlaceEntries, type PlaceEntry } from '@/hooks/use-places'
import { placesApi } from '@/lib/api/places'

const purchases = (n: number) => `${n} ${n === 1 ? 'compra' : 'compras'}`

// Todos os locais das compras da família, dos mais frequentes para os menos. Tocar salva apelido e endereço.
export default function PlacesPage() {
  const { entries, loading } = usePlaceEntries()
  const del = useConfirmDelete()
  const [target, setTarget] = useState<PlaceTarget | null>(null)

  const row = (e: PlaceEntry) => e.kind === 'saved' ? (
    <ListRow key={e.key} title={placeTitle(e.place)} chevron onClick={() => setTarget({ place: e.place })}
      subtitle={[purchases(e.count), e.place.address].filter(Boolean).join(' · ')}
      onDelete={() => del.ask({ title: `Excluir "${placeTitle(e.place)}"?`, remove: () => placesApi.remove(e.place.id) })} />
  ) : (
    <ListRow key={e.key} title={e.name} subtitle={purchases(e.count)} chevron onClick={() => setTarget({ name: e.name })} />
  )

  return (
    <>
      {del.sheet}
      <LargeTitleHeader title="Locais" />
      <div className="space-y-7 px-4 pt-2">
        {loading ? <LoadingBlock /> : entries.length === 0 ? (
          <EmptyState variant="block" title="Nenhum local">Os locais aparecem conforme você registra gastos.</EmptyState>
        ) : (
          <ListGroup footer="A família inteira vê e edita estes locais.">{entries.map(row)}</ListGroup>
        )}
      </div>
      <PlaceSheet target={target} onClose={() => setTarget(null)} />
    </>
  )
}
