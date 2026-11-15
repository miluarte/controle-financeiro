'use client'

import { useMemo } from 'react'
import { useCategories } from './use-categories'
import { useAllMyTransactions, useCategorySpending } from './use-data'
import { useMonthSummary } from './use-month-summary'
import { useProfile } from './use-profile'
import { useSession } from './use-session'
import { spendingProfile } from '@/lib/replan'
import { currentMonth } from '@/lib/utils'

// Dados do replanejamento: histórico, metas vigentes, renda e orçamento do mês atual.
export function useReplanData() {
  const month = currentMonth()
  const { session } = useSession()
  const { profile } = useProfile()
  const { categories } = useCategories()
  const { rows: spending } = useCategorySpending(month)
  const { summary } = useMonthSummary(month)
  const { transactions, loading } = useAllMyTransactions(session?.user.id)

  const data = useMemo(() => {
    const goals = new Map(spending.map(r => [r.categoryId, r.goal]))
    return spendingProfile(transactions, categories, goals)
  }, [transactions, categories, spending])

  return {
    month,
    profile: data,
    income: profile?.monthlyIncome ?? null,
    budget: summary?.budget ?? null,
    userId: session?.user.id,
    profileId: profile?.id,
    loading,
  }
}
