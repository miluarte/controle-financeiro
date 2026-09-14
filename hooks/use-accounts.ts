'use client'

import useSWR from 'swr'
import { useCallback } from 'react'
import type { Account } from '@/lib/types'
import { accountsApi } from '@/lib/api/accounts'

const KEY = ['getAccounts'] as const

function normalizeArchived(raw: Account[]): Account[] {
  // Google Sheets retorna booleanos como strings ("true"/"false").
  return raw.map(a => ({
    ...a,
    archived: a.archived === true || String(a.archived).toLowerCase() === 'true',
  }))
}

export function useAccounts() {
  const { data, error, isLoading, mutate } = useSWR<Account[]>(
    KEY,
    () => accountsApi.getAll().then(normalizeArchived),
  )

  const accounts = data ?? []

  const create = useCallback(async (data: Parameters<typeof accountsApi.create>[0]) => {
    const account = await accountsApi.create(data)
    mutate([...accounts, account], false)
    return account
  }, [accounts, mutate])

  const update = useCallback(async (data: Parameters<typeof accountsApi.update>[0]) => {
    const account = await accountsApi.update(data)
    mutate(accounts.map(a => a.id === account.id ? account : a), false)
    return account
  }, [accounts, mutate])

  const archive = useCallback(async (id: string) => {
    const account = await accountsApi.archive(id)
    mutate(accounts.map(a => a.id === account.id ? account : a), false)
    return account
  }, [accounts, mutate])

  return {
    accounts,
    loading: isLoading,
    error: error ? (error instanceof Error ? error.message : 'Erro ao carregar contas') : null,
    reload: () => mutate(),
    create,
    update,
    archive,
  }
}
