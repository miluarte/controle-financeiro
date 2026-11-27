import type { Place, PlaceName } from '../types'
import { supabase, unwrap } from '../supabase/client'

type Row = {
  id: string; nickname: string | null; address: string | null; maps_url: string | null
  latitude: number | null; longitude: number | null; place_names: { key: string; name: string }[] | null }

const toPlace = (r: Row): Place => ({
  id: r.id,
  nickname: r.nickname,
  address: r.address,
  mapsUrl: r.maps_url,
  latitude: r.latitude,
  longitude: r.longitude,
  names: (r.place_names ?? []).map(n => ({ key: n.key, name: n.name })),
})

// Locais da família (ou só seus, sem família). O app mostra sempre o nome da maquininha; o apelido só ajuda a reconhecer.
export const placesApi = {
  list: async (): Promise<Place[]> =>
    unwrap(await supabase.from('places').select('id, nickname, address, maps_url, latitude, longitude, place_names(key, name)')).map(r => toPlace(r as Row)),

  // cria (sem id) ou atualiza; nome da maquininha que estava em outro local passa para este
  save: async (p: {
    id: string | null; nickname: string; address: string; names: PlaceName[]
    mapsUrl: string | null; latitude: number | null; longitude: number | null
  }): Promise<string> => {
    const { data, error } = await supabase.rpc('save_place', {
      p_id: p.id, p_nickname: p.nickname, p_address: p.address, p_names: p.names,
      p_maps_url: p.mapsUrl, p_latitude: p.latitude, p_longitude: p.longitude,
    })
    if (error) throw new Error(error.message)
    return data as string
  },

  remove: async (id: string) => {
    unwrap(await supabase.from('places').delete().eq('id', id))
  },
}

// Link do Google Maps (Compartilhar > Copiar link): a Edge Function ler-mapa segue o link curto e devolve
// o nome, o endereço e o ponto do lugar.
export type MapsPlace = { url: string; name: string | null; address: string | null; latitude: number | null; longitude: number | null }

export async function readMapsLink(text: string): Promise<MapsPlace | null> {
  const { data, error } = await supabase.functions.invoke('ler-mapa', { body: { url: text } })
  if (error || !data?.ok) return null
  return data as MapsPlace
}

