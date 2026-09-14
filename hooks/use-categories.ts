'use client'

import useSWR from 'swr'
import { useCallback } from 'react'
import type { Category } from '@/lib/types'
import { categoriesApi } from '@/lib/api/categories'

const KEY = ['getCategories'] as const

export function useCategories() {
  const { data, error, isLoading, mutate } = useSWR<Category[]>(KEY, () => categoriesApi.getAll())

  const categories = data ?? []

  const create = useCallback(async (data: Parameters<typeof categoriesApi.create>[0]) => {
    const category = await categoriesApi.create(data)
    mutate([...categories, category], false)
    return category
  }, [categories, mutate])

  return {
    categories,
    loading: isLoading,
    error: error ? (error instanceof Error ? error.message : 'Erro ao carregar categorias') : null,
    reload: () => mutate(),
    create,
  }
}
