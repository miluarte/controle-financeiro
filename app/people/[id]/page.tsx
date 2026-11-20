'use client'

import { useParams } from 'next/navigation'
import { PersonDebtView } from '@/components/family/person-debt-view'
import { LargeTitleHeader } from '@/components/ios/large-title-header'
import { MonthSelector } from '@/components/shared/month-selector'
import { useMonth } from '@/hooks/use-month'
import { useWallets } from '@/hooks/use-wallets'

// Pessoa da família que tem cartão compartilhado comigo: quanto devo no mês e as minhas compras.
export default function PersonPage() {
  const { id } = useParams<{ id: string }>()
  const { month } = useMonth()
  const { wallets } = useWallets()
  const name = wallets.find(w => w.ownerId === id && w.ownerName)?.ownerName ?? 'Família'

  return (
    <>
      <LargeTitleHeader back title={name} actions={<MonthSelector />} />
      <div className="space-y-7 px-4 pt-2">
        <PersonDebtView ownerId={id} month={month} />
      </div>
    </>
  )
}
