'use client'

import useSWR from 'swr'
import { useCallback } from 'react'
import type { InstallmentGroup } from '@/lib/types'
import { installmentsApi } from '@/lib/api/installments'

export function useInstallments(accountId?: string) {
  const key = accountId ? ['getInstallmentGroups', accountId] : ['getInstallmentGroups']

  const { data, error, isLoading, mutate } = useSWR<InstallmentGroup[]>(
    key,
    () => accountId ? installmentsApi.getByAccount(accountId) : installmentsApi.getAll()
  )

  const groups = data ?? []

  const create = useCallback(async (data: Parameters<typeof installmentsApi.create>[0]) => {
    const result = await installmentsApi.create(data)
    mutate([...groups, result.group], false)
    return result
  }, [groups, mutate])

  const update = useCallback(async (data: Parameters<typeof installmentsApi.update>[0]) => {
    const group = await installmentsApi.update(data)
    mutate(groups.map(g => g.id === group.id ? group : g), false)
    return group
  }, [groups, mutate])

  const cancel = useCallback(async (groupId: string) => {
    const group = await installmentsApi.cancel(groupId)
    mutate(groups.map(g => g.id === group.id ? group : g), false)
    return group
  }, [groups, mutate])

  const payOff = useCallback(async (groupId: string) => {
    const group = await installmentsApi.payOff(groupId)
    mutate(groups.map(g => g.id === group.id ? group : g), false)
    return group
  }, [groups, mutate])

  return {
    groups,
    loading: isLoading,
    error: error ? (error instanceof Error ? error.message : 'Erro ao carregar parcelamentos') : null,
    reload: () => mutate(),
    create,
    update,
    cancel,
    payOff,
  }
}
