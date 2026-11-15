'use client'

import { useContext } from 'react'
import { MonthContext } from '@/components/shared/month-provider'

export function useMonth() {
  return useContext(MonthContext)
}
