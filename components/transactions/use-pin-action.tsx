'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { PinBoldIcon, PinLinearIcon } from '@solar-icons/react'
import { ActionSheet } from '@/components/ios/action-sheet'
import type { SwipeExtra } from '@/components/ios/swipe-actions'
import { useRefresh } from '@/hooks/use-refresh'
import { useSession } from '@/hooks/use-session'
import { billsApi } from '@/lib/api/bills'
import { transactionsApi } from '@/lib/api/transactions'
import type { Transaction } from '@/lib/types'
import { addMonths, currentMonth } from '@/lib/utils'
import { feedback } from '@/lib/feedback'

// Fixar um gasto no deslizar da linha: vira conta fixa que repete todo mês até ser desafixada.
// Desafixar encerra a conta a partir do mês seguinte (o que já foi lançado continua).
export function usePinAction() {
  const refresh = useRefresh()
  const { session } = useSession()
  const { data: active } = useSWR(['active-bills'], () => billsApi.activeIds())
  const [unpinning, setUnpinning] = useState<Transaction | null>(null)
  const pinned = (t: Transaction) => !!t.billId && !!active?.includes(t.billId)

  async function pin(t: Transaction) {
    try { await transactionsApi.pin(t.id); await refresh(); feedback.done('Gasto fixado') }
    catch (err) { feedback.error(err instanceof Error ? err.message : 'Não foi possível fixar.') }
  }

  // ação do deslizar (só gasto à vista confirmado; parcelada não vira conta fixa)
  function extra(t: Transaction): SwipeExtra | undefined {
    if (t.type !== 'expense' || t.status !== 'confirmed' || t.installmentGroupId || t.owner !== session?.user.id) return undefined
    if (pinned(t)) return { label: 'Desafixar', icon: <PinBoldIcon />, onClick: () => setUnpinning(t) }
    if (t.billId) return undefined
    return { label: 'Fixar', icon: <PinLinearIcon />, onClick: () => pin(t) }
  }

  const sheet = (
    <ActionSheet open={!!unpinning} onOpenChange={o => { if (!o) setUnpinning(null) }}
      title="Desafixar? Para de repetir a partir do próximo mês."
      actions={unpinning ? [{
        label: 'Desafixar', destructive: true,
        onSelect: async () => {
          try { await billsApi.endSeries(unpinning.billId!, addMonths(currentMonth(), 1)); await refresh(); feedback.done('Gasto desafixado') }
          catch (err) { feedback.error(err instanceof Error ? err.message : 'Não foi possível desafixar.') }
        },
      }] : []} />
  )
  // pode fixar/desafixar (gasto à vista meu e confirmado)
  const can = (t: Transaction) => t.type === 'expense' && t.status === 'confirmed' && !t.installmentGroupId && t.owner === session?.user.id
  return { extra, pinned, can, pin, askUnpin: setUnpinning, sheet }
}
