'use client'

import useSWR from 'swr'
import { transactionsApi } from '@/lib/api/transactions'
import { useSession } from './use-session'

export function useMonthTransactions(month: string) {
  const { session } = useSession()
  const userId = session?.user.id
  const { data, error, isLoading } = useSWR(
    userId ? ['transactions', month, userId] : null,
    () => transactionsApi.getByMonth(month, userId!),
  )
  return { transactions: data ?? [], loading: isLoading || !userId, error }
}
