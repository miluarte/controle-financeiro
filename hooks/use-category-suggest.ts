'use client'

import { useCallback, useMemo } from 'react'
import useSWR from 'swr'
import { useCategories } from '@/hooks/use-categories'
import { usePlaces } from '@/hooks/use-places'
import { transactionsApi } from '@/lib/api/transactions'
import { buildPlaceMemory, suggestCategory } from '@/lib/category-suggest'

// Sugere a categoria de um gasto, sem IA: a categoria do local salvo; sem ela, a última que você deu ao local
// (histórico); depois, palavras-chave.
export function useCategorySuggest() {
  const { categories } = useCategories()
  const { data } = useSWR(['place-history'], () => transactionsApi.placeHistory())
  // só as suas categorias: compras da família no seu cartão trazem as categorias de outra pessoa
  const memory = useMemo(() => {
    const mine = new Set(categories.map(c => c.id))
    return buildPlaceMemory((data ?? []).filter(r => r.categoryId && mine.has(r.categoryId)))
  }, [data, categories])
  const { placeFor } = usePlaces()
  return useCallback(
    (place: string | null | undefined, items?: { name: string }[]) => {
      const saved = placeFor(place)?.categoryId
      if (saved && categories.some(c => c.id === saved && c.type === 'expense' && c.active)) return saved
      return suggestCategory({ place, items }, categories, memory)
    },
    [categories, memory, placeFor],
  )
}
