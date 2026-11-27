'use client'

import { useState } from 'react'
import { LargeTitleHeader } from '@/components/ios/large-title-header'
import { ListGroup } from '@/components/ios/list-group'
import { useConfirmDelete } from '@/components/ios/use-delete-action'
import { PlaceRow } from '@/components/places/place-row'
import { PlaceSheet, type PlaceTarget } from '@/components/places/place-sheet'
import { EmptyState } from '@/components/shared/empty-state'
import { LoadingBlock } from '@/components/shared/loading-dots'
import { useCategories } from '@/hooks/use-categories'
import { placeMachineNames, placeTitle, usePlaceEntries, type PlaceEntry } from '@/hooks/use-places'
import { placesApi } from '@/lib/api/places'

// Todos os locais das compras da família, em ordem alfabética pelo nome da maquininha, cada um numa PlaceRow.
export default function PlacesPage() {
  const { entries, loading } = usePlaceEntries()
  const del = useConfirmDelete()
  const { categories } = useCategories()
  const categoryOf = (id: string | null) => categories.find(c => c.id === id) ?? null
  const [target, setTarget] = useState<PlaceTarget | null>(null)

  const row = (e: PlaceEntry) => e.kind === 'saved' ? (
    <PlaceRow key={e.key} name={placeMachineNames(e.place)} brand={e.place.nickname} address={e.place.address}
      online={e.place.online} category={categoryOf(e.place.categoryId)} onClick={() => setTarget({ place: e.place })}
      onDelete={() => del.ask({ title: `Excluir "${placeTitle(e.place)}"?`, remove: () => placesApi.remove(e.place.id) })} />
  ) : (
    <PlaceRow key={e.key} name={e.name} onClick={() => setTarget({ name: e.name })} />
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
