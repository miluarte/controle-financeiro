'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { ModalSheet } from '@/components/ios/modal-sheet'
import { useMyDebts } from '@/hooks/use-family'
import { useMonthSummary } from '@/hooks/use-month-summary'
import { useWallets } from '@/hooks/use-wallets'
import { formatCurrency } from '@/lib/utils'

interface PersonDebt { ownerId: string; name: string; total: number; cards: { walletId: string; name: string; value: number }[] }

// 5.7.7: "A receber de membros" (titular) e "Você deve" (membro), na Home.
// O que eu devo é somado por pessoa (todos os cartões dela); tocar abre o cartão ou, com mais de um, a lista.
export function FamilyBalances({ month }: { month: string }) {
  const router = useRouter()
  const { summary } = useMonthSummary(month)
  const debts = useMyDebts()
  const { wallets } = useWallets()
  const [open, setOpen] = useState<PersonDebt | null>(null)
  const receivable = summary?.receivableFromMembers ?? 0

  // só a fatura que vence no mês escolhido (e atrasadas), sem as parcelas futuras
  const people = new Map<string, PersonDebt>()
  for (const d of debts) {
    if (d.open <= 0 || d.dueDate.slice(0, 7) > month) continue
    const w = wallets.find(x => x.id === d.walletId)
    const ownerId = w?.ownerId ?? d.walletId
    const person = people.get(ownerId) ?? { ownerId, name: w?.ownerName ?? 'titular', total: 0, cards: [] }
    person.total += d.open
    const card = person.cards.find(c => c.walletId === d.walletId)
    if (card) card.value += d.open
    else person.cards.push({ walletId: d.walletId, name: w?.name ?? 'Cartão', value: d.open })
    people.set(ownerId, person)
  }

  if (receivable <= 0 && people.size === 0) return null

  function openPerson(p: PersonDebt) {
    if (p.cards.length === 1) router.push(`/cards/${p.cards[0].walletId}`)
    else setOpen(p)
  }

  return (
    <>
      <ListGroup header="Família">
        {receivable > 0 && (
          <ListRow title="A receber de membros" trailing={<span className="font-semibold text-success">{formatCurrency(receivable)}</span>}
            onClick={() => router.push('/config/wallets')} chevron />
        )}
        {[...people.values()].map(p => (
          <ListRow key={p.ownerId} title={`Você deve a ${p.name}`} subtitle={p.cards.map(c => c.name).join(' e ')}
            trailing={<span className="font-semibold text-foreground">{formatCurrency(p.total)}</span>}
            onClick={() => openPerson(p)} chevron />
        ))}
      </ListGroup>

      <ModalSheet open={!!open} onOpenChange={o => { if (!o) setOpen(null) }} title={open ? `Você deve a ${open.name}` : ''}>
        <ListGroup footer={open ? `Total: ${formatCurrency(open.total)}` : undefined}>
          {open?.cards.map(c => (
            <ListRow key={c.walletId} title={c.name} chevron onClick={() => router.push(`/cards/${c.walletId}`)}
              trailing={<span className="font-semibold text-foreground">{formatCurrency(c.value)}</span>} />
          ))}
        </ListGroup>
      </ModalSheet>
    </>
  )
}
