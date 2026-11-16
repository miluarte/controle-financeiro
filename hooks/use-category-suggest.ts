'use client'

import { useCallback, useMemo } from 'react'
import useSWR from 'swr'
import { useCategories } from '@/hooks/use-categories'
import { transactionsApi } from '@/lib/api/transactions'
import { buildPlaceMemory, suggestCategory } from '@/lib/category-suggest'

// Sugere a categoria de um gasto pelo seu histórico e por palavras-chave, sem IA.
export function useCategorySuggest() {
  const { categories } = useCategories()
  const { data } = useSWR(['place-history'], () => transactionsApi.placeHistory())
  const memory = useMemo(() => buildPlaceMemory(data ?? []), [data])
  return useCallback(
    (place: string | null | undefined, items?: { name: string }[]) => suggestCategory({ place, items }, categories, memory),
    [categories, memory],
  )
}
