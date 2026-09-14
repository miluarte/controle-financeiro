'use client'

import useSWR from 'swr'
import { useCallback } from 'react'
import type { BudgetGoal } from '@/lib/types'
import { budgetGoalsApi } from '@/lib/api/budget-goals'
import { currentMonth } from '@/lib/utils'

export function useBudgetGoals(month?: string) {
  const activeMonth = month ?? currentMonth()
  const key = ['getBudgetGoals', activeMonth] as const

  const { data, error, isLoading, mutate } = useSWR<BudgetGoal[]>(key, () => budgetGoalsApi.getByMonth(activeMonth))

  const goals = data ?? []

  const create = useCallback(async (data: Parameters<typeof budgetGoalsApi.create>[0]) => {
    const goal = await budgetGoalsApi.create(data)
    mutate([...goals, goal], false)
    return goal
  }, [goals, mutate])

  const update = useCallback(async (data: Parameters<typeof budgetGoalsApi.update>[0]) => {
    const goal = await budgetGoalsApi.update(data)
    mutate(goals.map(g => g.id === goal.id ? goal : g), false)
    return goal
  }, [goals, mutate])

  const remove = useCallback(async (id: string) => {
    await budgetGoalsApi.delete(id)
    mutate(goals.filter(g => g.id !== id), false)
  }, [goals, mutate])

  return {
    goals,
    loading: isLoading,
    error: error ? (error instanceof Error ? error.message : 'Erro ao carregar metas') : null,
    reload: () => mutate(),
    create,
    update,
    remove,
  }
}
