'use client'

import { Suspense } from 'react'
import { BalanceCard } from '@/components/home/balance-card'
import { FirstSteps } from '@/components/home/first-steps'
import { HomeHero } from '@/components/home/home-hero'
import { MonthAnalysisLink } from '@/components/home/month-analysis-link'
import { RecentTransactions } from '@/components/home/recent-transactions'
import { PendingBanner } from '@/components/pending/pending-banner'
import { Screen } from '@/components/ios/screen'
import { currentMonth } from '@/lib/utils'

// Início: faixa colorida com saudação e saldo do mês atual, depois o atalho da análise do mês e as transações recentes.
// Fundo da tela no tom dos cards (a lista fica direto nele, sem card).
export default function HomePage() {
  const month = currentMonth()
  return (
    <Screen variant="grouped">
      <HomeHero>
        <BalanceCard month={month} />
      </HomeHero>
      <div className="space-y-7 px-4 pt-7">
        <Suspense><PendingBanner /></Suspense>
        <MonthAnalysisLink month={month} />
        <FirstSteps />
        <RecentTransactions month={month} />
      </div>
    </Screen>
  )
}
