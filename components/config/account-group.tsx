'use client'

import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { supabase } from '@/lib/supabase/client'

// ACE-4: sair da conta, em linha vermelha centralizada como no iOS.
export function AccountGroup() {
  async function handleSignOut() {
    if (!confirm('Sair da conta?')) return
    await supabase.auth.signOut()
    // recarrega para limpar o cache do usuário anterior
    window.location.replace('/home')
  }

  return (
    <ListGroup header="Conta">
      <ListRow tone="destructive" title="Sair da conta" onClick={handleSignOut} />
    </ListGroup>
  )
}
