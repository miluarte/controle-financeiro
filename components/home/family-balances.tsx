'use client'

import { useRouter } from 'next/navigation'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { useMyDebts } from '@/hooks/use-family'
import { useMonthSummary } from '@/hooks/use-month-summary'
import { useWallets } from '@/hooks/use-wallets'
import { formatCurrency } from '@/lib/utils'

// 5.7.7: "A receber de membros" (titular) e "Você deve" (membro), na Home.
export function FamilyBalances({ month }: { month: string }) {
  const router = useRouter()
  const { summary } = useMonthSummary(month)
  const debts = useMyDebts()
  const { wallets } = useWallets()
  const receivable = summary?.receivableFromMembers ?? 0

  // só a fatura que vence no mês escolhido (e atrasadas), sem as parcelas futuras
  const owed = new Map<string, number>()
  for (const d of debts) {
    if (d.open > 0 && d.dueDate.slice(0, 7) <= month) owed.set(d.walletId, (owed.get(d.walletId) ?? 0) + d.open)
  }

  if (receivable <= 0 && owed.size === 0) return null

  return (
    <ListGroup header="Família">
      {receivable > 0 && (
        <ListRow title="A receber de membros" trailing={<span className="font-semibold text-success">{formatCurrency(receivable)}</span>}
          onClick={() => router.push('/config/wallets')} chevron />
      )}
      {[...owed.entries()].map(([walletId, value]) => {
        const w = wallets.find(x => x.id === walletId)
        return (
          <ListRow key={walletId} title={`Você deve a ${w?.ownerName ?? 'titular'}`} subtitle={w?.name}
            trailing={<span className="font-semibold text-foreground">{formatCurrency(value)}</span>}
            onClick={() => router.push(`/cards/${walletId}`)} chevron />
        )
      })}
    </ListGroup>
  )
}
