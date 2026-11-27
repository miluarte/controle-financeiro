'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { SearchField } from '@/components/ios/search-field'
import { LoadingDots } from '@/components/shared/loading-dots'
import { googlePlaces, type MapsPlace, type PlaceSuggestion } from '@/lib/api/places'

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

  useEffect(() => {
    if (!enabled || !touched) return
    const q = query.trim()
    let live = true
    const timer = setTimeout(async () => {
      if (q.length < 3) { setResults([]); return }
      setBusy(true)
      const found = await googlePlaces.search(q, session).catch(() => [])
      if (live) { setResults(found); setBusy(false) }
    }, 350)
    return () => { live = false; clearTimeout(timer) }
  }, [query, enabled, touched, session])

  async function pick(s: PlaceSuggestion) {
    setBusy(true)
    const d = await googlePlaces.details(s.placeId, session).catch(() => null)
    setBusy(false)
    setResults([])
    setTouched(false)
    setQuery(s.name)
    if (d) onPick({ ...d, name: s.name })
  }

  if (!enabled) return null
  return (
    <ListGroup header="Buscar no Google">
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
