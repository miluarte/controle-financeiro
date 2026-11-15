'use client'

import useSWR from 'swr'
import { summaryApi } from '@/lib/api/summary'

export function useMonthSummary(month: string) {
  const { data, error, isLoading } = useSWR(['summary', month], () => summaryApi.month(month))
  return { summary: data ?? null, loading: isLoading, error }
}
