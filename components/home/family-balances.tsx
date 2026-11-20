'use client'

import { useRouter } from 'next/navigation'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { useMyDebts } from '@/hooks/use-family'
import { useMonthSummary } from '@/hooks/use-month-summary'
import { useWallets } from '@/hooks/use-wallets'
import { formatCurrency } from '@/lib/utils'

// 5.7.7: "A receber de membros" (titular) e "Você deve" (membro), na Home.
// O que eu devo é somado por pessoa (todos os cartões dela); tocar abre a pessoa (/people/[id]).
export function FamilyBalances({ month }: { month: string }) {
  const router = useRouter()
  const { summary } = useMonthSummary(month)
  const debts = useMyDebts()
  const { wallets } = useWallets()
  const receivable = summary?.receivableFromMembers ?? 0

  // só a fatura que vence no mês escolhido (e atrasadas), sem as parcelas futuras
  const people = new Map<string, { name: string; total: number; cards: string[] }>()
  for (const d of debts) {
    if (d.open <= 0 || d.dueDate.slice(0, 7) > month) continue
    const w = wallets.find(x => x.id === d.walletId)
    if (!w?.ownerId) continue
    const p = people.get(w.ownerId) ?? { name: w.ownerName ?? 'titular', total: 0, cards: [] }
    p.total += d.open
    if (!p.cards.includes(w.name)) p.cards.push(w.name)
    people.set(w.ownerId, p)
  }

  if (receivable <= 0 && people.size === 0) return null

  return (
    <ListGroup header="Família">
      {receivable > 0 && (
        <ListRow title="A receber de membros" trailing={<span className="font-semibold text-success">{formatCurrency(receivable)}</span>}
          onClick={() => router.push('/config/wallets')} chevron />
      )}
      {[...people.entries()].map(([ownerId, p]) => (
        <ListRow key={ownerId} title={`Você deve a ${p.name}`} subtitle={p.cards.join(' e ')}
          trailing={<span className="font-semibold text-foreground">{formatCurrency(p.total)}</span>}
          onClick={() => router.push(`/people/${ownerId}`)} chevron />
      ))}
    </ListGroup>
  )
}
