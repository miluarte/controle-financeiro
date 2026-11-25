'use client'

import { createContext, useCallback, useEffect, useRef, useState } from 'react'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import posthog from 'posthog-js'
import { OPENED_FROM_RECOVERY_LINK, supabase } from '@/lib/supabase/client'

const posthogConfigured = Boolean(
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN && process.env.NEXT_PUBLIC_POSTHOG_HOST,
)

interface SessionState {
  session: Session | null
  loading: boolean
  // entrou pelo link de redefinir senha: falta escolher a nova senha
  recovery: boolean
  endRecovery: () => void
}

export const SessionContext = createContext<SessionState>({
  session: null,
  loading: true,
  recovery: false,
  endRecovery: () => {},
})

// Uma única assinatura de sessão para o app inteiro.
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [recovery, setRecovery] = useState(OPENED_FROM_RECOVERY_LINK)
  const identifiedUserId = useRef<string | null>(null)

  useEffect(() => {
    function syncSession(event: AuthChangeEvent, nextSession: Session | null) {
      setSession(nextSession)
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      if (event === 'SIGNED_OUT') setRecovery(false)

      if (nextSession) {
        if (identifiedUserId.current === nextSession.user.id) return

        if (identifiedUserId.current && posthogConfigured) posthog.reset()

        if (posthogConfigured) {
          const name = nextSession.user.user_metadata.name ?? nextSession.user.user_metadata.full_name
          posthog.identify(nextSession.user.id, {
            ...(nextSession.user.email ? { email: nextSession.user.email } : {}),
            ...(typeof name === 'string' ? { name } : {}),
          })
        }
        identifiedUserId.current = nextSession.user.id
        return
      }

      if (event === 'SIGNED_OUT' && identifiedUserId.current && posthogConfigured) posthog.reset()
      if (event === 'SIGNED_OUT') identifiedUserId.current = null
    }

    supabase.auth.getSession().then(({ data }) => {
      syncSession('INITIAL_SESSION', data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange(syncSession)
    return () => data.subscription.unsubscribe()
  }, [])

  const endRecovery = useCallback(() => setRecovery(false), [])

  return <SessionContext.Provider value={{ session, loading, recovery, endRecovery }}>{children}</SessionContext.Provider>
}
