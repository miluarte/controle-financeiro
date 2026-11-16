'use client'

import { useEffect, useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { FormRow } from '@/components/ios/form-row'
import { ListGroup } from '@/components/ios/list-group'
import { useProfile } from '@/hooks/use-profile'
import { useSession } from '@/hooks/use-session'
import { disableLock, enableLock, lockCredential, lockSupported } from '@/lib/app-lock'

// Config > Segurança: bloquear o app com Face ID neste aparelho.
export function SecurityGroup() {
  const { session } = useSession()
  const { profile } = useProfile()
  const userId = session?.user.id
  const [supported, setSupported] = useState(false)
  const [on, setOn] = useState(() => !!userId && !!lockCredential(userId))
  const [error, setError] = useState<string | null>(null)

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
    <ListGroup header="Segurança" footer={error ?? (supported ? 'Só neste aparelho.' : 'Este aparelho não tem Face ID disponível.')}>
      <FormRow label="Bloquear com Face ID">
        <Switch checked={on} disabled={!supported} onCheckedChange={toggle} />
      </FormRow>
    </ListGroup>
  )
}
