'use client'

import { useState } from 'react'
import { ActionSheet, type ActionSheetAction } from '@/components/ios/action-sheet'
import { useRefresh } from '@/hooks/use-refresh'
import { billsApi } from '@/lib/api/bills'
import { feedback } from '@/lib/feedback'
import type { BillOccurrence } from '@/lib/types'

// Excluir um gasto fixo (ou receita fixa) em Contas: só este mês (o mês some, os outros continuam) ou
// este e os próximos (encerra a série; os meses pagos continuam). Gasto único a pagar: só Excluir.
export function useBillDelete(onDone?: () => void) {
  const refresh = useRefresh()
  const [target, setTarget] = useState<BillOccurrence | null>(null)

  const run = (fn: () => Promise<unknown>, done: string) => async () => {
    try { await fn(); await refresh(); onDone?.(); feedback.done(done) }
    catch (err) { feedback.error(err instanceof Error ? err.message : 'Não foi possível excluir.') }
  }

  const o = target
  const single = !!o && !o.bill.recurring && o.bill.installmentsTotal == null
  const income = o?.bill.type === 'income'
  const month = o?.refMonth.slice(0, 7) ?? ''
  const actions: ActionSheetAction[] = !o ? []
    : single ? [{ label: 'Excluir', destructive: true, onSelect: run(() => billsApi.removeSingle(o), 'Excluído') }]
    : [
      { label: 'Só este mês', destructive: true, onSelect: run(() => billsApi.skip(o), 'Excluído') },
      { label: 'Este e os próximos', destructive: true, onSelect: run(() => billsApi.endSeries(o.billId, month), 'Encerrado') },
    ]
  const title = !o ? ''
    : single ? 'Excluir este gasto a pagar?'
    : o.paidAt
      ? `Excluir ${income ? 'esta receita' : 'este gasto'}? O lançamento deste mês também sai.`
      : `Excluir ${income ? 'esta receita' : 'este gasto'}?`

  const sheet = <ActionSheet open={!!target} onOpenChange={v => { if (!v) setTarget(null) }} title={title} actions={actions} />
  return { ask: setTarget, sheet }
}
