'use client'

import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { profileApi } from '@/lib/api/profile'
import { supabase } from '@/lib/supabase/client'

// ACE-4 e ACE-5: sair e excluir conta.
export function AccountGroup() {
  async function signOut() {
    if (!confirm('Sair da conta?')) return
    await supabase.auth.signOut()
    window.location.replace('/home')
  }

  async function deleteAccount() {
    if (!confirm('Excluir sua conta? Todos os seus dados serão apagados e isso não pode ser desfeito.')) return
    if (prompt('Para confirmar, digite EXCLUIR') !== 'EXCLUIR') return
    try {
      await profileApi.deleteAccount()
      window.location.replace('/home')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Não foi possível excluir a conta.')
    }
  }

  return (
    <ListGroup header="Conta">
      <ListRow tone="destructive" title="Sair da conta" onClick={signOut} />
      <ListRow tone="destructive" title="Excluir conta" onClick={deleteAccount} />
    </ListGroup>
  )
}
