'use client'

import { SWRConfig } from 'swr'
import { SessionProvider } from '@/components/auth/session-provider'
import { MonthProvider } from '@/components/shared/month-provider'
import { ThemeSync } from '@/components/shared/theme-sync'
import { IosViewportFix } from '@/components/shared/ios-viewport-fix'
import { Toaster } from '@/components/ui/sonner'
import { TransactionDetailProvider } from '@/components/transactions/transaction-detail-provider'

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
          <IosViewportFix />
          <TransactionDetailProvider>{children}</TransactionDetailProvider>
          <Toaster />
        </MonthProvider>
      </SessionProvider>
    </SWRConfig>
  )
}
