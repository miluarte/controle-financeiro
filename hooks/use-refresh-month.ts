'use client'

import { useSWRConfig } from 'swr'

// Depois de gravar um lançamento, recarrega lista e resumo do mês.
export function useRefreshMonth() {
  const { mutate } = useSWRConfig()
  return () =>
    mutate(key => Array.isArray(key) && (key[0] === 'transactions' || key[0] === 'summary'))
}
