'use client'

import { useState } from 'react'
import { ActionSheet } from '@/components/ios/action-sheet'
import { useRefresh } from '@/hooks/use-refresh'
import { transactionsApi } from '@/lib/api/transactions'
import type { Transaction } from '@/lib/types'

// Excluir lançamento com confirmação; parcelado pergunta se é só esta parcela ou a compra inteira.
export function useTransactionDelete(onDone?: () => void) {
  const refresh = useRefresh()
  const [target, setTarget] = useState<Transaction | null>(null)

  async function remove(t: Transaction, all: boolean) {
    try {
      if (all && t.installmentGroupId) await transactionsApi.removeInstallmentGroup(t.installmentGroupId)
      else await transactionsApi.remove(t.id)
      await refresh(); onDone?.()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Não foi possível excluir.')
    }
  }

  const t = target
  const sheet = (
    <ActionSheet open={!!t} onOpenChange={o => { if (!o) setTarget(null) }}
      title={t?.installmentGroupId ? 'O que você quer excluir?' : 'Excluir este lançamento?'}
      actions={!t ? [] : t.installmentGroupId
        ? [{ label: 'Só esta parcela', destructive: true, onSelect: () => remove(t, false) },
           { label: 'A compra inteira', destructive: true, onSelect: () => remove(t, true) }]
        : [{ label: 'Excluir', destructive: true, onSelect: () => remove(t, false) }]} />
  )
  return { ask: setTarget, sheet }
}
