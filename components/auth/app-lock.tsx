'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { FaceScanSquareLinearIcon } from '@solar-icons/react'
import { Button } from '@/components/ui/button'
import { AppLogo } from '@/components/shared/app-logo'
import { lockCredential, unlock } from '@/lib/app-lock'
import { supabase } from '@/lib/supabase/client'

// Depois de 1 minuto fora do app, pede o Face ID de novo.
const RELOCK_MS = 60_000

export function AppLock({ userId, children }: { userId: string; children: React.ReactNode }) {
  const [locked, setLocked] = useState(() => typeof window !== 'undefined' && !!lockCredential(userId))
  const [error, setError] = useState(false)
  const hiddenAt = useRef<number | null>(null)

  const tryUnlock = useCallback(async () => {
    setError(false)
    try {
      if (await unlock(userId)) setLocked(false)
      else setError(true)
    } catch {
      setError(true)
    }
  }, [userId])

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === 'hidden') hiddenAt.current = Date.now()
      else if (hiddenAt.current && Date.now() - hiddenAt.current > RELOCK_MS && lockCredential(userId)) setLocked(true)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [userId])

  if (!locked) return <>{children}</>

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <AppLogo size="lg" />
      <p className="text-title2 font-bold">Troco bloqueado</p>
      <Button size="lg" className="w-full max-w-xs gap-2" onClick={tryUnlock}>
        <FaceScanSquareLinearIcon className="size-6" />Desbloquear
      </Button>
      {error && <p className="text-footnote text-destructive">Não deu certo. Tente de novo.</p>}
      <Button variant="plain" onClick={() => supabase.auth.signOut()}>Entrar com senha</Button>
    </div>
  )
}
