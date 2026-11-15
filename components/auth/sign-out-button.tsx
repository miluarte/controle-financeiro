'use client'

import { LogoutBoldDuotoneIcon } from '@solar-icons/react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export function SignOutButton() {
  async function handleSignOut() {
    await supabase.auth.signOut()
    // Recarrega pra limpar o cache do SWR do usuário anterior.
    window.location.href = '/dashboard'
  }

  return (
    <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sair">
      <LogoutBoldDuotoneIcon className="h-6 w-6" />
    </Button>
  )
}
