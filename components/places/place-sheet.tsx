'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { AddRow } from '@/components/ios/add-row'
import { FormRow } from '@/components/ios/form-row'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { ModalSheet } from '@/components/ios/modal-sheet'
import { useDeleteAction } from '@/components/ios/use-delete-action'
import { BrandSuggestions } from '@/components/places/brand-suggestions'
import { CategoryField } from '@/components/shared/category-field'
import { FormError } from '@/components/shared/form-error'
import { LoadingDots } from '@/components/shared/loading-dots'
import { useCategories } from '@/hooks/use-categories'
import { placeTitle, usePlaces } from '@/hooks/use-places'
import { useRefresh } from '@/hooks/use-refresh'
import { placesApi, readMapsLink, type MapsPlace } from '@/lib/api/places'
import { feedback } from '@/lib/feedback'
import { placeKey } from '@/lib/places'
import type { Place, PlaceName } from '@/lib/types'

// O que a folha abre: um local salvo, ou um novo a partir do nome da maquininha de uma compra.
export type PlaceTarget = { place: Place } | { name: string }

// Local: apelido e endereço opcionais e os nomes da maquininha que levam a ele. Compartilhado com a família.
export function PlaceSheet({ target, onClose }: { target: PlaceTarget | null; onClose: () => void }) {
  const place = target && 'place' in target ? target.place : null
  const del = useDeleteAction({
    title: `Excluir "${place ? placeTitle(place) : ''}"?`,
    remove: () => placesApi.remove(place!.id), onDone: onClose,
  })
  const key = target ? ('place' in target ? target.place.id : `novo-${target.name}`) : ''
  return (
    <>
      <ModalSheet open={!!target} onOpenChange={o => { if (!o) onClose() }} title={place ? 'Local' : 'Novo local'}
        formId="place" actionLabel="Salvar" onDelete={place ? del.ask : undefined}>
        {target && <Form key={key} place={place} firstName={'name' in target ? target.name : null} onDone={onClose} />}
      </ModalSheet>
      {del.sheet}
    </>
  )
}

function Form({ place, firstName, onDone }: { place: Place | null; firstName: string | null; onDone: () => void }) {
  const refresh = useRefresh()
  // apelidos já usados: o mesmo apelido em locais diferentes (ex.: duas lojas da mesma marca) junta na análise
  const { places } = usePlaces()
  const nicknames = [...new Set(places.map(p => p.nickname).filter((n): n is string => !!n))]
  const [nickname, setNickname] = useState(place?.nickname ?? '')
  const [address, setAddress] = useState(place?.address ?? '')
  const [online, setOnline] = useState(place?.online ?? false)
  const expenseCategories = useCategories().categories.filter(c => c.type === 'expense')
  const [categoryId, setCategoryId] = useState<string | null>(place?.categoryId ?? null)
  const [names, setNames] = useState<PlaceName[]>(
    () => place?.names ?? (firstName ? [{ key: placeKey(firstName), name: firstName }] : []))
  const [mapsUrl, setMapsUrl] = useState(place?.mapsUrl ?? '')
  const [point, setPoint] = useState(place?.latitude != null && place.longitude != null
    ? { latitude: place.latitude, longitude: place.longitude } : null)
  const [reading, setReading] = useState(false)
  const [mapsError, setMapsError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // lugar lido do link do Maps: endereço (ou o nome do lugar, sem endereço), ponto e link
  function applyPlace(found: MapsPlace) {
    setMapsUrl(found.url)
    setMapsError(null)
    setAddress(found.address ?? found.name ?? '')
    setPoint(found.latitude != null && found.longitude != null ? { latitude: found.latitude, longitude: found.longitude } : null)
  }

  // Endereço: digitado à mão ou colado do Maps. Com link, lê endereço e ponto; apagar tudo tira o link e o ponto.
  async function changeAddress(text: string) {
    setMapsError(null)
    if (!/https:\/\//.test(text)) {
      setAddress(text)
      if (!text.trim()) { setMapsUrl(''); setPoint(null) }
      return
    }
    setReading(true)
    const found = await readMapsLink(text).catch(() => null)
    setReading(false)
    if (!found) { setMapsError('Não foi possível ler esse link do Maps.'); return }
    applyPlace(found)
  }

  function addName(name: string) {
    const k = placeKey(name)
    if (!names.some(n => n.key === k)) setNames([...names, { key: k, name }])
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (names.length === 0) { setError('Inclua ao menos um nome da maquininha.'); return }
    setError(null)
    try {
      await placesApi.save({
        id: place?.id ?? null, nickname, address, names,
        mapsUrl: mapsUrl.trim() || null, latitude: point?.latitude ?? null, longitude: point?.longitude ?? null,
        categoryId, online,
      })
      await refresh()
      onDone()
      feedback.done('Local salvo')
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível salvar.') }
  }

  return (
    <form id="place" onSubmit={save} className="space-y-6">
      <ListGroup footer={online ? 'Lojas da mesma marca ficam juntas na análise.'
        : mapsError ?? (point ? 'Ponto do mapa salvo.' : 'Digite o endereço ou cole o link do Maps.')}>
        <FormRow label="Marca" htmlFor="place-nickname">
          <Input id="place-nickname" variant="bare" value={nickname} onChange={e => setNickname(e.target.value)}
            placeholder="Opcional" maxLength={80} autoComplete="off" className="text-right" />
        </FormRow>
        <BrandSuggestions brands={nicknames} query={nickname} onPick={setNickname} />
        <FormRow label="Loja online">
          <Switch checked={online} onCheckedChange={setOnline} />
        </FormRow>
        {!online && (
          <FormRow label="Endereço" htmlFor="place-address">
            {reading ? <LoadingDots size="sm" /> : (
              <Input id="place-address" variant="bare" value={address} onChange={e => changeAddress(e.target.value)}
                placeholder="Digitar ou colar link" maxLength={500} autoComplete="street-address" className="text-right" />
            )}
          </FormRow>
        )}
        {!online && mapsUrl && !reading && <ListRow tone="tint" title="Abrir no Maps" onClick={() => window.open(mapsUrl, '_blank')} />}
      </ListGroup>

      <ListGroup footer="Sugerida nas compras deste local, para toda a família.">
        <CategoryField categories={expenseCategories} value={categoryId} onChange={setCategoryId} id="place-category"
          placeholder="Opcional" />
        {categoryId && <ListRow tone="destructive" title="Remover categoria" onClick={() => setCategoryId(null)} />}
      </ListGroup>

      <ListGroup header="Nomes na maquininha" footer="Compras com qualquer um desses nomes são deste local.">
        {names.map(n => (
          <ListRow key={n.key} title={n.name} onDelete={() => setNames(names.filter(x => x.key !== n.key))} />
        ))}
        <AddRow label="Nome na maquininha" placeholder="Outro nome" onAdd={addName} />
      </ListGroup>

      <FormError message={error} />
    </form>
  )
}
