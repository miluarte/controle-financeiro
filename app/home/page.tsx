'use client'

import { BalanceCard } from '@/components/home/balance-card'
import { HomeHeader } from '@/components/home/home-header'
import { RecentTransactions } from '@/components/home/recent-transactions'
import { QuickAddSheet } from '@/components/transactions/quick-add-sheet'
import { currentMonth } from '@/lib/utils'

export default function HomePage() {
  const month = currentMonth()
  return (
    <>
      <div className="flex items-end justify-between pr-4">
        <HomeHeader />
        <QuickAddSheet />
      </div>
      <div className="space-y-6 p-4">
        <BalanceCard month={month} />
        <RecentTransactions month={month} />
      </div>
    </>
  )
}
