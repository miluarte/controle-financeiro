'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { SearchField } from '@/components/ios/search-field'
import { LoadingDots } from '@/components/shared/loading-dots'
import { googlePlaces, type MapsPlace, type PlaceSearchError, type PlaceSuggestion } from '@/lib/api/places'

const ERRORS: Record<PlaceSearchError, string> = {
  limit: 'Limite de buscas de hoje atingido. Cole o link do Maps.',
  google: 'Busca do Google indisponível. Cole o link do Maps.',
}

// Busca do lugar no Google: digitar o nome, escolher na lista e o endereço e o ponto vêm prontos.
// Some quando a chave do Google não está configurada (fica só o link do Maps).
export function GooglePlaceSearch({ initial, onPick }: { initial: string; onPick: (p: MapsPlace) => void }) {
  const { data: enabled } = useSWR(['google-places-enabled'], () => googlePlaces.enabled())
  // um token por abertura da folha: a busca e o detalhe contam como uma sessão só no Google
  const [session] = useState(() => crypto.randomUUID())
  const [query, setQuery] = useState(initial)
  const [results, setResults] = useState<PlaceSuggestion[]>([])
  const [busy, setBusy] = useState(false)
  const [touched, setTouched] = useState(false)
  const [error, setError] = useState<PlaceSearchError | null>(null)

  useEffect(() => {
    if (!enabled || !touched) return
    const q = query.trim()
    let live = true
    const timer = setTimeout(async () => {
      if (q.length < 3) { setResults([]); return }
      setBusy(true)
      const found = await googlePlaces.search(q, session).catch(() => ({ results: [], error: 'google' as const }))
      if (live) { setResults(found.results); setError(found.error); setBusy(false) }
    }, 350)
    return () => { live = false; clearTimeout(timer) }
  }, [query, enabled, touched, session])

  async function pick(s: PlaceSuggestion) {
    setBusy(true)
    const d = await googlePlaces.details(s.placeId, session).catch(() => ({ place: null, error: 'google' as const }))
    setBusy(false)
    setResults([])
    setTouched(false)
    setQuery(s.name)
    setError(d.error)
    if (d.place) onPick({ ...d.place, name: s.name })
  }

  if (!enabled) return null
  return (
    <ListGroup header="Buscar no Google" footer={error ? ERRORS[error] : undefined}>
      <li className="p-3">
        <SearchField placeholder="Nome do lugar" value={query} onFocus={() => setTouched(true)}
          onChange={e => { setTouched(true); setQuery(e.target.value) }} />
      </li>
      {busy && <li className="flex justify-center p-3"><LoadingDots size="sm" /></li>}
      {!busy && results.map(r => (
        <ListRow key={r.placeId} title={r.name} subtitle={r.detail} onClick={() => pick(r)} />
      ))}
    </ListGroup>
  )
}
