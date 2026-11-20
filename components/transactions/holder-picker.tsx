'use client'

import { PickerRow } from '@/components/shared/picker-row'
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

// texto de apoio de "Não lembro o cartão"
export function holderFooter(holders: CardHolder[], value: string | null, me: string) {
  const other = holders.find(h => h.id === value && h.id !== me)
  return other ? `Fica pendente até você ou ${other.name} escolher o cartão.` : 'Fica pendente até você escolher o cartão.'
}

// "Não lembro o cartão": escolhe só de quem é o cartão (linha com seletor). A compra fica pendente até escolherem qual.
export function HolderPicker({ holders, value, onChange, me }: {
  holders: CardHolder[]
  value: string | null
  onChange: (id: string) => void
  me: string
}) {
  return (
    <PickerRow id="qa-holder" label="Cartão de" value={value} onChange={v => v && onChange(v)}
      options={holders.map(h => ({ value: h.id, label: h.id === me ? 'Meu' : h.name, icon: h.id === me ? 'credit-card' : 'users' }))} />
  )
}
