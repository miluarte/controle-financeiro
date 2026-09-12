'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Transaction } from '@/lib/types'
import { transactionsApi } from '@/lib/api/transactions'
import { currentMonth } from '@/lib/utils'

export function useTransactions(month?: string) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const activeMonth = month ?? currentMonth()

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await transactionsApi.getByMonth(activeMonth)
      setTransactions(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar transações')
    } finally {
      setLoading(false)
    }
  }, [activeMonth])

  useEffect(() => { load() }, [load])

  const create = useCallback(async (data: Parameters<typeof transactionsApi.create>[0]) => {
    const tx = await transactionsApi.create(data)
    setTransactions(prev => [tx, ...prev])
    return tx
  }, [])

  const update = useCallback(async (data: Parameters<typeof transactionsApi.update>[0]) => {
    const tx = await transactionsApi.update(data)
    setTransactions(prev => prev.map(t => t.id === tx.id ? tx : t))
    return tx
  }, [])

  const remove = useCallback(async (id: string) => {
    await transactionsApi.delete(id)
    setTransactions(prev => prev.filter(t => t.id !== id))
  }, [])

  return { transactions, loading, error, reload: load, create, update, remove }
}
