'use client'

import { useRouter } from 'next/navigation'
import { useSWRConfig } from 'swr'
import type { Transaction } from '@/lib/types'

// Abre a página de detalhe de um lançamento (ao tocar numa linha ou logo depois de registrar no +).
// Com o lançamento em mãos, ele já entra no cache e a página abre preenchida, sem esperar o banco.
export function useShowTransaction() {
  const router = useRouter()
  const { mutate } = useSWRConfig()
  return (t: Transaction | string) => {
    const id = typeof t === 'string' ? t : t.id
    if (typeof t !== 'string') mutate(['transaction', id], t, { revalidate: false })
    router.push(`/transactions/${id}`)
  }
}
