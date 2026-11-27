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
  // só as suas categorias: compras da família no seu cartão trazem as categorias de outra pessoa
  const memory = useMemo(() => {
    const mine = new Set(categories.map(c => c.id))
    return buildPlaceMemory((data ?? []).filter(r => r.categoryId && mine.has(r.categoryId)))
  }, [data, categories])
  return useCallback(
    (place: string | null | undefined, items?: { name: string }[]) => suggestCategory({ place, items }, categories, memory),
    [categories, memory],
  )
}
