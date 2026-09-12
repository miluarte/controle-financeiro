'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Account } from '@/lib/types'
import { accountsApi } from '@/lib/api/accounts'

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await accountsApi.getAll()
      setAccounts(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar contas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const create = useCallback(async (data: Parameters<typeof accountsApi.create>[0]) => {
    const account = await accountsApi.create(data)
    setAccounts(prev => [...prev, account])
    return account
  }, [])

  const update = useCallback(async (data: Parameters<typeof accountsApi.update>[0]) => {
    const account = await accountsApi.update(data)
    setAccounts(prev => prev.map(a => a.id === account.id ? account : a))
    return account
  }, [])

  const archive = useCallback(async (id: string) => {
    const account = await accountsApi.archive(id)
    setAccounts(prev => prev.map(a => a.id === account.id ? account : a))
    return account
  }, [])

  return { accounts, loading, error, reload: load, create, update, archive }
}
