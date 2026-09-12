'use client'

import { useState, useEffect, useCallback } from 'react'
import type { BudgetGoal } from '@/lib/types'
import { budgetGoalsApi } from '@/lib/api/budget-goals'
import { currentMonth } from '@/lib/utils'

export function useBudgetGoals(month?: string) {
  const [goals, setGoals] = useState<BudgetGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const activeMonth = month ?? currentMonth()

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await budgetGoalsApi.getByMonth(activeMonth)
      setGoals(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar metas')
    } finally {
      setLoading(false)
    }
  }, [activeMonth])

  useEffect(() => { load() }, [load])

  const create = useCallback(async (data: Parameters<typeof budgetGoalsApi.create>[0]) => {
    const goal = await budgetGoalsApi.create(data)
    setGoals(prev => [...prev, goal])
    return goal
  }, [])

  const update = useCallback(async (data: Parameters<typeof budgetGoalsApi.update>[0]) => {
    const goal = await budgetGoalsApi.update(data)
    setGoals(prev => prev.map(g => g.id === goal.id ? goal : g))
    return goal
  }, [])

  const remove = useCallback(async (id: string) => {
    await budgetGoalsApi.delete(id)
    setGoals(prev => prev.filter(g => g.id !== id))
  }, [])

  return { goals, loading, error, reload: load, create, update, remove }
}
