import type { Profile } from '../types'
import { supabase, unwrap } from '../supabase/client'
import { toProfile } from '../supabase/mappers'

export const profileApi = {
  get: async () => toProfile(unwrap(await supabase.from('profiles').select('*').single())),

  update: async (id: string, patch: { name?: string; theme?: Profile['theme'] }) =>
    toProfile(unwrap(await supabase.from('profiles').update(patch).eq('id', id).select('*').single())),
}
