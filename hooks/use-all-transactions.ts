'use client'

import useSWR from 'swr'
import type { Transaction } from '@/lib/types'
import { transactionsApi } from '@/lib/api/transactions'

// Busca todas as transações, sem filtro de mês — usado pela fatura (chart +
// lista), que precisa somar parcelas, compras únicas e recorrências futuras
// e passadas de uma vez, não só o mês corrente que useTransactions traz.
const KEY = ['getTransactions', 'all'] as const

export function useAllTransactions() {
  const { data, error, isLoading, mutate } = useSWR<Transaction[]>(
    KEY,
    () => transactionsApi.getAll().then(rows =>
      rows.map(t => ({ ...t, amount: Number(t.amount) || 0 }))
    ),
  )

  return {
    transactions: data ?? [],
    loading: isLoading,
    error: error ? (error instanceof Error ? error.message : 'Erro ao carregar transações') : null,
    reload: () => mutate(),
  }
}
