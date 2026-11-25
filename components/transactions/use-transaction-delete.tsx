'use client'

import { useState } from 'react'
import { ActionSheet } from '@/components/ios/action-sheet'
import { useRefresh } from '@/hooks/use-refresh'
import { transactionsApi } from '@/lib/api/transactions'
import { sharedApi } from '@/lib/api/shared'
import type { Transaction } from '@/lib/types'
import { feedback } from '@/lib/feedback'
import posthog from 'posthog-js'

// Excluir lançamento com confirmação; parcelado pergunta se é só esta parcela ou a compra inteira.
export function useTransactionDelete(onDone?: () => void) {
  const refresh = useRefresh()
  const [target, setTarget] = useState<Transaction | null>(null)

  async function remove(t: Transaction, all: boolean) {
    try {
      // parte de Pix dividido: sai o Pix inteiro (a parte de todas as pessoas)
      if (t.sharedPaymentId) await sharedApi.remove(t.sharedPaymentId)
      // compra inteira: todas as parcelas e, na compra dividida, a parte de cada pessoa
      else if (all) await transactionsApi.removePurchase(t.id)
      else await transactionsApi.remove(t.id)
      await refresh()
      posthog.capture('transaction_deleted', {
        transaction_type: t.type,
        deletion_scope: all ? 'installment_group' : 'single_transaction',
        is_installment: Boolean(t.installmentGroupId),
      })
      onDone?.()
      // lançamento avulso (não parcela): "Desfazer" no aviso recria igual
      const undo = !t.installmentGroupId && !t.sharedPaymentId && ['expense', 'income', 'save_apply', 'save_redeem'].includes(t.type)
        ? async () => {
            await transactionsApi.create({
              type: t.type as 'expense', amount: t.amount, date: t.date, categoryId: t.categoryId, walletId: t.walletId,
              place: t.place, description: t.description, source: t.source, sourceData: t.sourceData, receiptPath: t.receiptPath,
            })
            await refresh(); feedback.done('Restaurado')
          }
        : undefined
      feedback.done(all ? 'Compra excluída' : t.installmentGroupId ? 'Parcela excluída' : 'Excluído', undo)
    } catch (err) {
      feedback.error(err instanceof Error ? err.message : 'Não foi possível excluir.')
    }
  }

  const t = target
  // compra dividida no cartão: sai a compra inteira (a parte de todas as pessoas)
  const split = !!t && Array.isArray(t.sourceData?.split_parts)
  const sheet = (
    <ActionSheet open={!!t} onOpenChange={o => { if (!o) setTarget(null) }}
      title={t?.sharedPaymentId || split ? 'Excluir a compra dividida? Sai a parte de todas as pessoas.' : t?.installmentGroupId ? 'O que excluir?' : 'Excluir transação?'}
      actions={!t ? [] : split
        ? [{ label: 'Excluir', destructive: true, onSelect: () => remove(t, true) }]
        : t.installmentGroupId
        ? [{ label: 'Só esta parcela', destructive: true, onSelect: () => remove(t, false) },
           { label: 'Compra inteira', destructive: true, onSelect: () => remove(t, true) }]
        : [{ label: 'Excluir', destructive: true, onSelect: () => remove(t, false) }]} />
  )
  return { ask: setTarget, sheet }
}
