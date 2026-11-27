'use client'

import { useCallback, useMemo } from 'react'
import useSWR from 'swr'
import { placesApi } from '@/lib/api/places'
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
