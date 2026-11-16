'use client'

import { Suspense } from 'react'
import { LargeTitleHeader } from '@/components/ios/large-title-header'
import { BalanceCard } from '@/components/home/balance-card'
import { FamilyBalances } from '@/components/home/family-balances'
import { FirstSteps } from '@/components/home/first-steps'
import { RecentTransactions } from '@/components/home/recent-transactions'
import { PendingBanner } from '@/components/pending/pending-banner'
import { NotificationsButton } from '@/components/layout/notifications-button'
import { MonthSelector } from '@/components/shared/month-selector'
import { useMonth } from '@/hooks/use-month'
import { useProfile } from '@/hooks/use-profile'
import { greeting } from '@/lib/utils'

export default function HomePage() {
  const { month } = useMonth()
  const { profile } = useProfile()

  return (
    <>
      <LargeTitleHeader
        eyebrow={`${greeting()},`}
        title={profile?.name || ' '}
        actions={<><MonthSelector /><NotificationsButton /></>}
      />
      <div className="space-y-7 px-4 pt-2">
        <Suspense><PendingBanner /></Suspense>
        <BalanceCard month={month} />
        <FamilyBalances month={month} />
        <FirstSteps />
        <RecentTransactions month={month} />
      </div>
    </>
  )
}
