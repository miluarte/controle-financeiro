'use client'

import { useState, useEffect, useCallback } from 'react'
import type { InstallmentGroup } from '@/lib/types'
import { installmentsApi } from '@/lib/api/installments'

export function useInstallments(accountId?: string) {
  const [groups, setGroups] = useState<InstallmentGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = accountId
        ? await installmentsApi.getByAccount(accountId)
        : await installmentsApi.getAll()
      setGroups(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar parcelamentos')
    } finally {
      setLoading(false)
    }
  }, [accountId])

  useEffect(() => { load() }, [load])

  const create = useCallback(async (data: Parameters<typeof installmentsApi.create>[0]) => {
    const result = await installmentsApi.create(data)
    setGroups(prev => [...prev, result.group])
    return result
  }, [])

  const payOff = useCallback(async (groupId: string) => {
    const group = await installmentsApi.payOff(groupId)
    setGroups(prev => prev.map(g => g.id === group.id ? group : g))
    return group
  }, [])

  return { groups, loading, error, reload: load, create, payOff }
}
