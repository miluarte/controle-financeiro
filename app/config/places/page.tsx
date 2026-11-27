'use client'

import { useState } from 'react'
import { LargeTitleHeader } from '@/components/ios/large-title-header'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { useConfirmDelete } from '@/components/ios/use-delete-action'
import { PlaceSheet, type PlaceTarget } from '@/components/places/place-sheet'
import { EmptyState } from '@/components/shared/empty-state'
import { LoadingBlock } from '@/components/shared/loading-dots'
import { placeTitle, usePlaces } from '@/hooks/use-places'
import { placesApi } from '@/lib/api/places'

// Locais salvos pela família: apelido, endereço e os nomes da maquininha de cada um.
export default function PlacesPage() {
  const { places, loading } = usePlaces()
  const del = useConfirmDelete()
  const [target, setTarget] = useState<PlaceTarget | null>(null)

  return (
    <>
      {del.sheet}
      <LargeTitleHeader title="Locais" />
      <div className="space-y-7 px-4 pt-2">
        {loading ? <LoadingBlock /> : places.length === 0 ? (
          <EmptyState variant="block" title="Nenhum local salvo">Abra uma compra e toque em Apelido.</EmptyState>
        ) : (
          <ListGroup footer="A família inteira vê e edita estes locais.">
            {places.map(p => (
              <ListRow key={p.id} title={placeTitle(p)} chevron onClick={() => setTarget({ place: p })}
                subtitle={p.address ?? p.names.map(n => n.name).join(', ')}
                onDelete={() => del.ask({ title: `Excluir "${placeTitle(p)}"?`, remove: () => placesApi.remove(p.id) })} />
            ))}
          </ListGroup>
        )}
      </div>
      <PlaceSheet target={target} onClose={() => setTarget(null)} />
    </>
  )
}
