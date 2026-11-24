'use client'

import { useState } from 'react'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { useProfile } from '@/hooks/use-profile'
import { useRefresh } from '@/hooks/use-refresh'
import { profileApi } from '@/lib/api/profile'
import { supabase } from '@/lib/supabase/client'
import { useConfirmDelete } from '@/components/ios/use-delete-action'
import { ChangePasswordSheet } from './change-password-sheet'

// ACE-4 e ACE-5: trocar senha, sair e excluir conta.
export function AccountGroup() {
  const { profile } = useProfile()
  const refresh = useRefresh()
  const ask = useConfirmDelete()
  const [changingPassword, setChangingPassword] = useState(false)

  // volta para o passo a passo inicial (o AuthGate mostra o onboarding enquanto ele não termina)
  async function replayOnboarding() {
    if (!profile) return
    await profileApi.update(profile.id, { onboarding_completed_at: null })
    await refresh()
  }

  function signOut() {
    ask.ask({ title: 'Sair da conta?', label: 'Sair', done: null, remove: async () => {
      await supabase.auth.signOut()
      window.location.replace('/home')
    } })
  }

  // conta: duas confirmações seguidas, porque não tem volta
  function deleteAccount() {
    ask.ask({ title: 'Excluir conta? Todos os seus dados serão excluídos.', label: 'Excluir conta', done: null, remove: async () => {
      setTimeout(() => ask.ask({ title: 'Tem volta? Não. Excluir mesmo assim?', label: 'Excluir tudo', done: null, remove: async () => {
        await profileApi.deleteAccount()
        window.location.replace('/home')
      } }), 300)
    } })
  }

  return (
    <>
    {ask.sheet}
    <ChangePasswordSheet open={changingPassword} onOpenChange={setChangingPassword} />
    <ListGroup header="Conta">
      <ListRow title="Trocar senha" chevron onClick={() => setChangingPassword(true)} />
      <ListRow title="Ver introdução" chevron onClick={replayOnboarding} />
      <ListRow tone="destructive" title="Sair da conta" onClick={signOut} />
      <ListRow tone="destructive" title="Excluir conta" onClick={deleteAccount} />
    </ListGroup>
    </>
  )
}
