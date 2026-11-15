'use client'

import useSWR from 'swr'
import { familyApi } from '@/lib/api/family'

export function useFamily() {
  const { data, isLoading } = useSWR(['family'], () => familyApi.mine())
  return { family: data?.family ?? null, status: data?.status ?? null, role: data?.role ?? null, loading: isLoading }
}

export function useFamilyMembers(enabled = true) {
  const { data } = useSWR(enabled ? ['family-members'] : null, () => familyApi.members())
  return data ?? []
}

export function useMyDebts() {
  const { data } = useSWR(['my-debts'], () => familyApi.myDebts())
  return data ?? []
}
