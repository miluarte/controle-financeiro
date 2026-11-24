'use client'

import { Suspense } from 'react'
import { BalanceCard } from '@/components/home/balance-card'
import { FirstSteps } from '@/components/home/first-steps'
import { HomeHeader } from '@/components/home/home-header'
import { QuickActions } from '@/components/home/quick-actions'
import { RecentTransactions } from '@/components/home/recent-transactions'
import { ToPayList } from '@/components/home/to-pay-list'
import { PendingBanner } from '@/components/pending/pending-banner'
import { useMonth } from '@/hooks/use-month'

export default function HomePage() {
  const { month } = useMonth()

  return (
    <>
      <HomeHeader />
      <div className="space-y-7 px-4 pt-4">
        <BalanceCard month={month} />
        <QuickActions />
        <Suspense><PendingBanner /></Suspense>
        <FirstSteps />
        <ToPayList month={month} />
        <RecentTransactions month={month} />
      </div>
    </>
  )
}
