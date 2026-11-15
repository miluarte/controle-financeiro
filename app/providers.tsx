'use client'

import { SWRConfig } from 'swr'
import { SessionProvider } from '@/components/auth/session-provider'
import { MonthProvider } from '@/components/shared/month-provider'
import { ThemeSync } from '@/components/shared/theme-sync'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        dedupingInterval: 5000,
      }}
    >
      <SessionProvider>
        <MonthProvider>
          <ThemeSync />
          {children}
        </MonthProvider>
      </SessionProvider>
    </SWRConfig>
  )
}
