'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { DangerTriangleLinearIcon } from '@solar-icons/react'
import { AlertCard } from '@/components/shared/alert-card'
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
      <AlertCard tone="warning" icon={DangerTriangleLinearIcon} onClick={() => setOpen(true)}
        title={pending.length === 1 ? '1 gasto para confirmar' : `${pending.length} gastos para confirmar`}
        subtitle={<><Money size="inherit" tone="inherit" cents={total} /> no total</>} />
      <PendingSheet open={open} pending={pending} onOpenChange={setOpen} />
    </>
  )
}
