'use client'

import { useSWRConfig } from 'swr'

// Depois de qualquer gravação, recarrega os dados em cache (saldo, listas, fatura, análise).
export function useRefresh() {
  const { mutate } = useSWRConfig()
  return () => mutate(() => true)
}
