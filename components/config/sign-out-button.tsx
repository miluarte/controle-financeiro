'use client'

import { LogoutBoldDuotoneIcon } from '@solar-icons/react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

// ACE-4
export function SignOutButton() {
  async function handleSignOut() {
    await supabase.auth.signOut()
    // recarrega para limpar o cache do usuário anterior
    window.location.replace('/home')
  }

  return (
    <Button variant="outline" className="w-full" onClick={handleSignOut}>
      <LogoutBoldDuotoneIcon className="size-5" />
      Sair da conta
    </Button>
  )
}
