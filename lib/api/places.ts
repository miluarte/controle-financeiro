import type { Place, PlaceName } from '../types'
import { supabase, unwrap } from '../supabase/client'

type Row = { id: string; nickname: string | null; address: string | null; place_names: { key: string; name: string }[] | null }

const toPlace = (r: Row): Place => ({
  id: r.id,
  nickname: r.nickname,
  address: r.address,
  names: (r.place_names ?? []).map(n => ({ key: n.key, name: n.name })),
})

// Locais da família (ou só seus, sem família). O app mostra sempre o nome da maquininha; o apelido só ajuda a reconhecer.
export const placesApi = {
  list: async (): Promise<Place[]> =>
    unwrap(await supabase.from('places').select('id, nickname, address, place_names(key, name)')).map(r => toPlace(r as Row)),

  // cria (sem id) ou atualiza; nome da maquininha que estava em outro local passa para este
  save: async (p: { id: string | null; nickname: string; address: string; names: PlaceName[] }): Promise<string> => {
    const { data, error } = await supabase.rpc('save_place', {
      p_id: p.id, p_nickname: p.nickname, p_address: p.address, p_names: p.names,
    })
    if (error) throw new Error(error.message)
    return data as string
  },

  remove: async (id: string) => {
    unwrap(await supabase.from('places').delete().eq('id', id))
  },
}
