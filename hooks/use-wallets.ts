'use client'

import useSWR from 'swr'
import { walletsApi } from '@/lib/api/wallets'

export function useWallets() {
  const { data, error, isLoading } = useSWR(['wallets'], () => walletsApi.getAll())
  return { wallets: data ?? [], loading: isLoading, error }
}
