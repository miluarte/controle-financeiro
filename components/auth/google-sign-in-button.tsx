'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { supabase, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/lib/supabase/client'

// Entrar com Google (Supabase Auth, OAuth). Serve para entrar e para criar conta:
// na primeira vez a conta é criada e o onboarding pede o resto.
// O logo é a marca oficial do Google (imagem em public/brand), não um ícone da biblioteca.
export function GoogleSignInButton({ onError }: { onError: (message: string) => void }) {
  const [busy, setBusy] = useState(false)

  // sem o provedor ligado no Supabase, o redirecionamento cairia numa página de erro em inglês
  async function googleEnabled() {
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_PUBLISHABLE_KEY } })
      const settings = await res.json()
      return settings?.external?.google === true
    } catch {
      return true
    }
  }

  async function signIn() {
    setBusy(true)
    if (!(await googleEnabled())) {
      setBusy(false)
      onError('O login com Google ainda não foi ativado.')
      return
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/home` },
    })
    if (error) {
      setBusy(false)
      onError('Não foi possível abrir o login do Google.')
    }
  }

  return (
    <Button type="button" variant="outline" size="lg" className="w-full gap-3" disabled={busy} onClick={signIn}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/google-g.svg" alt="" aria-hidden className="size-5" />
      {busy ? 'Abrindo o Google…' : 'Continuar com Google'}
    </Button>
  )
}
