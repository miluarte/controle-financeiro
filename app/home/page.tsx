'use client'

import { Suspense } from 'react'
import { BalanceCard } from '@/components/home/balance-card'
import { FirstSteps } from '@/components/home/first-steps'
import { HomeHero } from '@/components/home/home-hero'
import { RecentTransactions } from '@/components/home/recent-transactions'
import { PendingBanner } from '@/components/pending/pending-banner'
import { currentMonth } from '@/lib/utils'

// Início: faixa colorida com saudação e saldo do mês atual, depois a atividade recente.
// Fundo da tela no tom dos cards (a lista fica direto nele, sem card).
export default function HomePage() {
  const month = currentMonth()
  return (
    <div className="-mb-shell-bottom min-h-app bg-grouped pb-shell-bottom lg:mb-0 lg:min-h-0 lg:rounded-3xl lg:pb-6">
      <HomeHero>
        <BalanceCard month={month} />
      </HomeHero>
      <div className="space-y-7 px-4 pt-7">
        <Suspense><PendingBanner /></Suspense>
        <FirstSteps />
        <RecentTransactions month={month} />
      </div>
    </div>
  )
}
