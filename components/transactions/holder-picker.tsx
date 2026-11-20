'use client'

import { ListGroup } from '@/components/ios/list-group'
import { ChoiceChip } from '@/components/shared/choice-chip'
import { TokenIcon } from '@/components/shared/token-icon'
import type { Wallet } from '@/lib/types'

export interface CardHolder { id: string; name: string }

// Titulares de cartão de crédito que posso usar: eu (se tenho cartão) e quem compartilha cartão comigo.
export function cardHolders(wallets: Wallet[], me: string): CardHolder[] {
  const list: CardHolder[] = []
  for (const w of wallets) {
    if (w.type !== 'credit') continue
    const id = w.ownerName ? w.ownerId : me
    if (!id || list.some(h => h.id === id)) continue
    list.push({ id, name: w.ownerName ?? 'Meu' })
  }
  return list
}

// "Não lembro o cartão": escolhe só de quem é o cartão. A compra fica pendente até escolherem qual.
export function HolderPicker({ holders, value, onChange, me }: {
  holders: CardHolder[]
  value: string | null
  onChange: (id: string) => void
  me: string
}) {
  const other = holders.find(h => h.id === value && h.id !== me)
  return (
    <ListGroup header="De quem é o cartão?"
      footer={other ? `Fica pendente até você ou ${other.name} escolher o cartão.` : 'Fica pendente até você escolher o cartão.'}>
      <li className="flex flex-wrap gap-2 p-3">
        {holders.map(h => (
          <ChoiceChip key={h.id} selected={value === h.id} onClick={() => onChange(h.id)} className="pl-1">
            <TokenIcon active={value === h.id} icon={h.id === me ? 'credit-card' : 'users'} color="gray" size="sm" />
            {h.id === me ? 'Meu' : h.name}
          </ChoiceChip>
        ))}
      </li>
    </ListGroup>
  )
}
