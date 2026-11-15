'use client'

import useSWR from 'swr'
import { profileApi } from '@/lib/api/profile'

export function useProfile() {
  const { data, error, isLoading, mutate } = useSWR(['profile'], () => profileApi.get())
  return { profile: data ?? null, loading: isLoading, error, mutate }
}
