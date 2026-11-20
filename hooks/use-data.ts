'use client'

import useSWR from 'swr'
import { analysisApi } from '@/lib/api/analysis'
import { billsApi } from '@/lib/api/bills'
import { categoriesApi } from '@/lib/api/categories'
import { invoicesApi } from '@/lib/api/invoices'
import { transactionsApi } from '@/lib/api/transactions'
import { institutionsApi, walletsApi } from '@/lib/api/wallets'
import { goalsApi, subscriptionsApi, vehiclesApi } from '@/lib/api/advanced'
import { notificationsApi } from '@/lib/api/notifications'
import { addMonths, daysInMonth, monthRange } from '@/lib/utils'

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
    const [totals, paid, paidAmounts] = await Promise.all([
      invoicesApi.totals(from, to), invoicesApi.paid(from, to), invoicesApi.paidAmounts(from, to),
    ])
    return { totals, paid, paidAmounts }
  })
  return { totals: data?.totals ?? [], paid: data?.paid ?? [], paidAmounts: data?.paidAmounts ?? [], loading: isLoading }
}

export function useCategorySpending(month: string) {
  const { data, isLoading } = useSWR(['category-spending', month], () => analysisApi.categorySpending(month))
  return { rows: data ?? [], loading: isLoading }
}

export function useHistory(months = 6) {
  const { data, isLoading } = useSWR(['history', months], () => analysisApi.history(months))
  return { history: data ?? [], loading: isLoading }
}

// Todos os meus lançamentos (replanejamento usa o histórico inteiro).
export function useAllMyTransactions(userId: string | undefined) {
  const { data, isLoading } = useSWR(userId ? ['all-mine', userId] : null, () => transactionsApi.getAllMine(userId!))
  return { transactions: data ?? [], loading: isLoading || !userId }
}

export function useClosings(months = 12) {
  const { data } = useSWR(['closings', months], () => analysisApi.closings(months))
  return data ?? []
}

export function useGoals() {
  const { data, isLoading } = useSWR(['goals'], () => goalsApi.list())
  return { goals: data ?? [], loading: isLoading }
}

export function useSubscriptions(month: string) {
  const from = monthRange(month).start
  const to = `${month}-${String(daysInMonth(month)).padStart(2, '0')}`
  const { data, isLoading } = useSWR(['subscriptions', month], async () => {
    const [list, uses] = await Promise.all([subscriptionsApi.list(), subscriptionsApi.uses(from, to)])
    return { list, uses }
  })
  return { subscriptions: data?.list ?? [], uses: data?.uses ?? [], loading: isLoading }
}

export function useVehicles(month: string) {
  const from = monthRange(month).start
  const to = `${month}-${String(daysInMonth(month)).padStart(2, '0')}`
  const { data, isLoading } = useSWR(['vehicles', month], async () => {
    const [list, trips, maintenance] = await Promise.all([vehiclesApi.list(), vehiclesApi.trips(from, to), vehiclesApi.maintenance()])
    return { list, trips, maintenance }
  })
  return { vehicles: data?.list ?? [], trips: data?.trips ?? [], maintenance: data?.maintenance ?? [], loading: isLoading }
}

export function usePending(userId: string | undefined) {
  const { data, isLoading } = useSWR(userId ? ['pending', userId] : null, () => transactionsApi.getPending(userId!))
  return { pending: data ?? [], loading: isLoading }
}

export function useInstitutions() {
  const { data } = useSWR(['institutions'], () => institutionsApi.list())
  return data ?? []
}

export function useInstitutionRates() {
  const { data } = useSWR(['institution-rates'], () => institutionsApi.rates())
  return data ?? []
}

export function useNotifications() {
  const { data, mutate } = useSWR(['notifications'], () => notificationsApi.list(), { refreshInterval: 60_000 })
  const list = data ?? []
  return { notifications: list, unread: list.filter(n => !n.readAt).length, mutate }
}
