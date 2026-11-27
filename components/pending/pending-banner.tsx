'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { DangerTriangleLinearIcon } from '@solar-icons/react'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { usePending } from '@/hooks/use-data'
import { useSession } from '@/hooks/use-session'
import { PendingSheet } from './pending-sheet'
import { Money } from '@/components/shared/money'

// Home: aviso (card amarelo, acima da Análise do mês) com os gastos esperando confirmação; some quando não há nenhum. Abre sozinho pelo aviso (?pendentes=1).
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
      <ListGroup variant="warning">
        <ListRow chevron onClick={() => setOpen(true)}
          leading={<DangerTriangleLinearIcon className="size-6 text-warning" />}
          title={<span className="text-subheadline font-semibold">
            {pending.length === 1 ? '1 gasto para confirmar' : `${pending.length} gastos para confirmar`}
          </span>}
          subtitle={<><Money size="inherit" tone="inherit" cents={total} /> no total</>} />
      </ListGroup>
      <PendingSheet open={open} pending={pending} onOpenChange={setOpen} />
    </>
  )
}
