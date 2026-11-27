'use client'

import useSWR from 'swr'
import { transactionsApi } from '@/lib/api/transactions'
import type { Transaction } from '@/lib/types'

// Valor cheio das compras parceladas de uma lista (por installment_group_id).
// Sem acesso ao grupo, o valor cheio é a parcela vezes o número de parcelas.
export function useInstallmentTotals(transactions: Transaction[]) {
  const ids = [...new Set(transactions.filter(isInstallment).map(t => t.installmentGroupId!))].sort()
  const { data } = useSWR(ids.length ? ['installment-totals', ...ids] : null, () => transactionsApi.groupTotals(ids))
  return (t: Transaction) =>
    isInstallment(t) ? (data?.[t.installmentGroupId!] ?? t.amount * t.installmentsTotal!) : undefined
}

function isInstallment(t: Transaction) {
  return !!t.installmentGroupId && (t.installmentsTotal ?? 0) > 1
}
