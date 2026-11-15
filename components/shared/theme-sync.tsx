'use client'

import { useEffect } from 'react'
import { useProfile } from '@/hooks/use-profile'
import { useSession } from '@/hooks/use-session'
import { setCurrency } from '@/lib/utils'

// NAV-3 e NAV-4: aplica o tema do perfil no <html> e a moeda padrão na formatação.
export function ThemeSync() {
  const { session } = useSession()
  const { profile } = useProfile(!!session)
  // renderiza antes do resto do app (irmão anterior em Providers), então a moeda já vale nesta passada
  if (profile) setCurrency(profile.currency)

  useEffect(() => {
    const theme = profile?.theme ?? 'system'
    const root = document.documentElement
    if (theme === 'system') delete root.dataset.theme
    else root.dataset.theme = theme
  }, [profile?.theme])

  return null
}
