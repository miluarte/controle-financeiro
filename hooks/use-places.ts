'use client'

import { useCallback, useMemo } from 'react'
import useSWR from 'swr'
import { placesApi } from '@/lib/api/places'
import { transactionsApi } from '@/lib/api/transactions'
import { placeKey } from '@/lib/places'
import type { Place } from '@/lib/types'

// Locais salvos e a busca do local pelo nome da maquininha (mesma regra da sugestão de categoria:
// sem maiúsculas, acentos e prefixo de intermediador).
export function usePlaces() {
  const { data, isLoading } = useSWR(['places'], () => placesApi.list())
  const places = useMemo(() => (data ?? []).slice().sort((a, b) =>
    placeTitle(a).localeCompare(placeTitle(b), 'pt-BR', { sensitivity: 'base' })), [data])
  const byKey = useMemo(() => {
    const map = new Map<string, Place>()
    for (const p of places) for (const n of p.names) map.set(n.key, p)
    return map
  }, [places])
  const placeFor = useCallback((name: string | null | undefined) => {
    const key = name?.trim() ? placeKey(name) : ''
    return key ? byKey.get(key) ?? null : null
  }, [byKey])
  return { places, placeFor, loading: isLoading }
}

// nome que o local mostra na lista: o apelido ou o primeiro nome da maquininha
export function placeTitle(p: Place) {
  return p.nickname ?? p.names[0]?.name ?? 'Local'
}

// Linha da lista de Locais: um local salvo ou um nome da maquininha ainda sem cadastro, com quantas compras teve.
export type PlaceEntry =
  | { kind: 'saved'; key: string; place: Place; count: number }
  | { kind: 'new'; key: string; name: string; count: number }

// Todos os locais das compras (salvos ou não), dos mais frequentes para os menos.
export function usePlaceEntries() {
  const { places, placeFor, loading } = usePlaces()
  const { data, isLoading } = useSWR(['place-names'], () => transactionsApi.placeNames())
  const entries = useMemo(() => {
    const saved = new Map<string, PlaceEntry & { kind: 'saved' }>(
      places.map(p => [p.id, { kind: 'saved', key: p.id, place: p, count: 0 }]))
    const fresh = new Map<string, { names: Map<string, number>; count: number }>()
    for (const name of data ?? []) {
      const p = placeFor(name)
      if (p) { saved.get(p.id)!.count++; continue }
      const key = placeKey(name)
      const e = fresh.get(key) ?? { names: new Map<string, number>(), count: 0 }
      e.count++
      e.names.set(name, (e.names.get(name) ?? 0) + 1)
      fresh.set(key, e)
    }
    const list: PlaceEntry[] = [...saved.values()]
    for (const [key, e] of fresh) {
      // nome mais usado entre as variações (ex.: "STUDIO Z" e "Studio Z")
      const name = [...e.names.entries()].sort((a, b) => b[1] - a[1])[0][0]
      list.push({ kind: 'new', key, name, count: e.count })
    }
    const title = (e: PlaceEntry) => (e.kind === 'saved' ? placeTitle(e.place) : e.name)
    return list.sort((a, b) => b.count - a.count || title(a).localeCompare(title(b), 'pt-BR', { sensitivity: 'base' }))
  }, [places, placeFor, data])
  return { entries, loading: loading || isLoading }
}
