'use client'

import { useState } from 'react'
import { ActionSheet } from '@/components/ios/action-sheet'
import { useRefresh } from '@/hooks/use-refresh'
import { transactionsApi } from '@/lib/api/transactions'
import type { Transaction } from '@/lib/types'
import { feedback } from '@/lib/feedback'

// Excluir lançamento com confirmação; parcelado pergunta se é só esta parcela ou a compra inteira.
export function useTransactionDelete(onDone?: () => void) {
  const refresh = useRefresh()
  const [target, setTarget] = useState<Transaction | null>(null)

  async function remove(t: Transaction, all: boolean) {
    try {
      if (all && t.installmentGroupId) await transactionsApi.removeInstallmentGroup(t.installmentGroupId)
      else await transactionsApi.remove(t.id)
      await refresh(); onDone?.()
      feedback.done(all ? 'Compra excluída' : t.installmentGroupId ? 'Parcela excluída' : 'Excluído')
    } catch (err) {
      feedback.error(err instanceof Error ? err.message : 'Não foi possível excluir.')
    }
  }

  const t = target
  const sheet = (
    <ActionSheet open={!!t} onOpenChange={o => { if (!o) setTarget(null) }}
      title={t?.installmentGroupId ? 'O que excluir?' : 'Excluir transação?'}
      actions={!t ? [] : t.installmentGroupId
        ? [{ label: 'Só esta parcela', destructive: true, onSelect: () => remove(t, false) },
           { label: 'Compra inteira', destructive: true, onSelect: () => remove(t, true) }]
        : [{ label: 'Excluir', destructive: true, onSelect: () => remove(t, false) }]} />
  )
  return { ask: setTarget, sheet }
}
