'use client'

import useSWR from 'swr'
import { useCallback } from 'react'
import type { Transaction } from '@/lib/types'
import { transactionsApi } from '@/lib/api/transactions'
import { currentMonth } from '@/lib/utils'

export function useTransactions(month?: string) {
  const activeMonth = month ?? currentMonth()
  const key = ['getTransactions', activeMonth] as const

  const { data, error, isLoading, mutate } = useSWR<Transaction[]>(
    key,
    () => transactionsApi.getByMonth(activeMonth).then(rows =>
      rows.map(t => ({ ...t, amount: Number(t.amount) || 0 }))
    ),
  )

  const transactions = data ?? []

  const create = useCallback(async (data: Parameters<typeof transactionsApi.create>[0]) => {
    const tx = await transactionsApi.create(data)
    mutate([tx, ...transactions], false)
    return tx
  }, [transactions, mutate])

  const update = useCallback(async (data: Parameters<typeof transactionsApi.update>[0]) => {
    const tx = await transactionsApi.update(data)
    mutate(transactions.map(t => t.id === tx.id ? tx : t), false)
    return tx
  }, [transactions, mutate])

  const remove = useCallback(async (id: string) => {
    await transactionsApi.delete(id)
    mutate(transactions.filter(t => t.id !== id), false)
  }, [transactions, mutate])

  return {
    transactions,
    loading: isLoading,
    error: error ? (error instanceof Error ? error.message : 'Erro ao carregar transações') : null,
    reload: () => mutate(),
    create,
    update,
    remove,
  }
}
