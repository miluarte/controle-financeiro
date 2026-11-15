'use client'

import useSWR from 'swr'
import { analysisApi } from '@/lib/api/analysis'
import { billsApi } from '@/lib/api/bills'
import { categoriesApi } from '@/lib/api/categories'
import { invoicesApi } from '@/lib/api/invoices'
import { walletsApi } from '@/lib/api/wallets'
import { addMonths } from '@/lib/utils'

// Hooks de leitura das telas da v1. Escrita: lib/api + useRefresh.

export function useOwnWallets() {
  const { data, isLoading } = useSWR(['own-wallets'], () => walletsApi.getOwn())
  return { wallets: data ?? [], loading: isLoading }
}

export function useAllCategories() {
  const { data, isLoading } = useSWR(['all-categories'], () => categoriesApi.getAll())
  return { categories: data ?? [], loading: isLoading }
}

export function useCategoryUsage() {
  const { data } = useSWR(['category-usage'], () => categoriesApi.usage())
  return data ?? new Map<string, number>()
}

export function useBills(month: string) {
  const { data, isLoading, error } = useSWR(['bills', month], () => billsApi.getMonth(month))
  return { occurrences: data ?? [], loading: isLoading, error }
}

// Faturas do mês anterior ao seguinte (cobre fatura atual, próxima e a que vence agora).
export function useInvoices(month: string) {
  const from = `${addMonths(month, -1)}-01`
  const to = `${addMonths(month, 12)}-01`
  const { data, isLoading } = useSWR(['invoices', month], async () => {
    const [totals, paid] = await Promise.all([invoicesApi.totals(from, to), invoicesApi.paid(from, to)])
    return { totals, paid }
  })
  return { totals: data?.totals ?? [], paid: data?.paid ?? [], loading: isLoading }
}

export function useCategorySpending(month: string) {
  const { data, isLoading } = useSWR(['category-spending', month], () => analysisApi.categorySpending(month))
  return { rows: data ?? [], loading: isLoading }
}

export function useHistory(months = 6) {
  const { data, isLoading } = useSWR(['history', months], () => analysisApi.history(months))
  return { history: data ?? [], loading: isLoading }
}
