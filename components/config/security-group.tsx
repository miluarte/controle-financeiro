'use client'

import { useEffect, useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { FormRow } from '@/components/ios/form-row'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { ChangePasswordSheet } from './change-password-sheet'
import { useProfile } from '@/hooks/use-profile'
import { useSession } from '@/hooks/use-session'
import { disableLock, enableLock, lockCredential, lockSupported } from '@/lib/app-lock'

// Config > Segurança: trocar a senha e bloquear o app com Face ID neste aparelho.
export function SecurityGroup() {
  const { session } = useSession()
  const { profile } = useProfile()
  const userId = session?.user.id
  const [supported, setSupported] = useState(false)
  const [on, setOn] = useState(() => !!userId && !!lockCredential(userId))
  const [error, setError] = useState<string | null>(null)
  const [changingPassword, setChangingPassword] = useState(false)

  useEffect(() => {
    lockSupported().then(setSupported)
  }, [])

  async function toggle(next: boolean) {
    if (!userId) return
    setError(null)
    if (!next) { disableLock(userId); setOn(false); return }
    try {
      await enableLock(userId, profile?.name ?? '')
      setOn(true)
    } catch {
      setError('Não foi possível ligar o Face ID.')
    }
  }

  return (
    <>
    <ChangePasswordSheet open={changingPassword} onOpenChange={setChangingPassword} />
    <ListGroup header="Segurança" footer={error ?? (supported ? 'O Face ID vale só neste aparelho.' : 'Este aparelho não tem Face ID disponível.')}>
      <ListRow title="Trocar senha" chevron onClick={() => setChangingPassword(true)} />
      <FormRow label="Bloquear com Face ID">
        <Switch checked={on} disabled={!supported} onCheckedChange={toggle} />
      </FormRow>
    </ListGroup>
    </>
  )
}
