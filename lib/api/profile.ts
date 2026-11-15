import type { Profile } from '../types'
import { supabase, unwrap } from '../supabase/client'
import { toProfile } from '../supabase/mappers'

export interface ProfilePatch {
  name?: string
  avatar_color?: string
  theme?: Profile['theme']
  currency?: string
  carry_over_balance?: boolean
  monthly_income?: number | null
  default_wallet_id?: string | null
  onboarding_dismissed?: boolean
}

export const profileApi = {
  get: async () => toProfile(unwrap(await supabase.from('profiles').select('*').single())),

  update: async (id: string, patch: ProfilePatch) =>
    toProfile(unwrap(await supabase.from('profiles').update(patch).eq('id', id).select('*').single())),

  // ACE-5
  deleteAccount: async () => {
    unwrap(await supabase.rpc('delete_account'))
    await supabase.auth.signOut()
  },
}
