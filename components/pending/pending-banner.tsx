'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { InboxLinearIcon } from '@solar-icons/react'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { usePending } from '@/hooks/use-data'
import { useSession } from '@/hooks/use-session'
import { PendingSheet } from './pending-sheet'
import { Money } from '@/components/shared/money'

// Home: gastos das automações esperando confirmação. Abre sozinho pelo aviso (?pendentes=1).
export function PendingBanner() {
  const { session } = useSession()
  const { pending } = usePending(session?.user.id)
  const params = useSearchParams()
  const [open, setOpen] = useState(false)
  const fromNotification = params.get('pendentes') === '1'

  useEffect(() => {
    if (fromNotification && pending.length) setOpen(true) // eslint-disable-line react-hooks/set-state-in-effect
  }, [fromNotification, pending.length])

  if (!pending.length) return null
  const total = pending.reduce((s, t) => s + t.amount, 0)

  return (
    <>
      <ListGroup variant="filled">
        <ListRow chevron onClick={() => setOpen(true)}
          leading={<InboxLinearIcon className="size-6 text-tint" />}
          title={`${pending.length} para confirmar`}
          trailing={<Money cents={total} />} />
      </ListGroup>
      <PendingSheet open={open} pending={pending} onOpenChange={setOpen} />
    </>
  )
}
