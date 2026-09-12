'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Category } from '@/lib/types'
import { categoriesApi } from '@/lib/api/categories'

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await categoriesApi.getAll()
      setCategories(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar categorias')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const create = useCallback(async (data: Parameters<typeof categoriesApi.create>[0]) => {
    const category = await categoriesApi.create(data)
    setCategories(prev => [...prev, category])
    return category
  }, [])

  return { categories, loading, error, reload: load, create }
}
