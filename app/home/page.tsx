'use client'

import { LargeTitleHeader } from '@/components/ios/large-title-header'
import { BalanceCard } from '@/components/home/balance-card'
import { RecentTransactions } from '@/components/home/recent-transactions'
import { QuickAddSheet } from '@/components/transactions/quick-add-sheet'
import { useProfile } from '@/hooks/use-profile'
import { currentMonth, greeting } from '@/lib/utils'

export default function HomePage() {
  const month = currentMonth()
  const { profile } = useProfile()

  return (
    <>
      <LargeTitleHeader
        eyebrow={`${greeting()},`}
        title={profile?.name || ' '}
        actions={<QuickAddSheet />}
      />
      <div className="space-y-7 px-4 pt-2">
        <BalanceCard month={month} />
        <RecentTransactions month={month} />
      </div>
    </>
  )
}
