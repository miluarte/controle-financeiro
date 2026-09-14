'use client'

import useSWR from 'swr'
import { useCallback } from 'react'
import type { RecurringGroup } from '@/lib/types'
import { recurringApi } from '@/lib/api/recurring'

const KEY = ['getRecurringGroups'] as const

export function useRecurringGroups() {
  const { data, error, isLoading, mutate } = useSWR<RecurringGroup[]>(KEY, () => recurringApi.getAll())

  const groups = data ?? []

  const deactivate = useCallback(async (groupId: string) => {
    await recurringApi.deactivate(groupId)
    mutate(groups.map(g => g.id === groupId ? { ...g, active: false } : g), false)
  }, [groups, mutate])

  return {
    groups,
    loading: isLoading,
    error: error ? (error instanceof Error ? error.message : 'Erro ao carregar recorrências') : null,
    reload: () => mutate(),
    deactivate,
  }
}
