'use client'

import useSWR from 'swr'
import { categoriesApi } from '@/lib/api/categories'

export function useCategories() {
  const { data, error, isLoading } = useSWR(['categories'], () => categoriesApi.getActive())
  return { categories: data ?? [], loading: isLoading, error }
}
