import type { Profile } from '../types'
import { supabase, unwrap } from '../supabase/client'
import { toProfile } from '../supabase/mappers'

export interface ProfilePatch {
  name?: string
  avatar_color?: string
  avatar_url?: string | null
  theme?: Profile['theme']
  currency?: string
  carry_over_balance?: boolean
  monthly_income?: number | null
  default_wallet_id?: string | null
  onboarding_dismissed?: boolean
  onboarding_completed_at?: string | null
}

const AVATARS = 'avatars'

// apaga as fotos da pasta da pessoa, menos a que ficou em uso
async function removePhotos(id: string, keep?: string) {
  const { data } = await supabase.storage.from(AVATARS).list(id, { limit: 100 })
  const old = (data ?? []).map(f => `${id}/${f.name}`).filter(p => p !== keep)
  if (old.length) await supabase.storage.from(AVATARS).remove(old)
}

export const profileApi = {
  get: async () => toProfile(unwrap(await supabase.from('profiles').select('*').single())),

  update: async (id: string, patch: ProfilePatch) =>
    toProfile(unwrap(await supabase.from('profiles').update(patch).eq('id', id).select('*').single())),

  // Foto de perfil: envia a imagem já cortada e comprimida para avatars/<id>/, grava a URL no perfil
  // e apaga as fotos anteriores. Cada envio tem um nome novo, então o cache do navegador nunca mostra a antiga.
  setPhoto: async (id: string, photo: Blob) => {
    const ext = photo.type === 'image/webp' ? 'webp' : 'jpg'
    const path = `${id}/${Date.now()}.${ext}`
    unwrap(await supabase.storage.from(AVATARS).upload(path, photo, { contentType: photo.type, cacheControl: '31536000' }))
    const url = supabase.storage.from(AVATARS).getPublicUrl(path).data.publicUrl
    const profile = await profileApi.update(id, { avatar_url: url })
    await removePhotos(id, path)
    return profile
  },

  removePhoto: async (id: string) => {
    const profile = await profileApi.update(id, { avatar_url: null })
    await removePhotos(id)
    return profile
  },

  // ACE-5
  deleteAccount: async () => {
    const { data } = await supabase.auth.getSession()
    if (data.session) await removePhotos(data.session.user.id).catch(() => {})
    unwrap(await supabase.rpc('delete_account'))
    await supabase.auth.signOut()
  },
}
