'use client'

import useSWR from 'swr'
import { profileApi } from '@/lib/api/profile'

export function useProfile(enabled = true) {
  const { data, error, isLoading, mutate } = useSWR(enabled ? ['profile'] : null, () => profileApi.get())
  return { profile: data ?? null, loading: isLoading, error, mutate }
}
