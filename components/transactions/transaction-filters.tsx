'use client'

import { useState } from 'react'
import { AltArrowDownLinearIcon } from '@solar-icons/react'
import { Button } from '@/components/ui/button'
import { ListGroup } from '@/components/ios/list-group'
import { ModalSheet } from '@/components/ios/modal-sheet'
import { ChoiceChip } from '@/components/shared/choice-chip'
import { TokenIcon } from '@/components/shared/token-icon'
import { WALLET_TYPE_ICON } from '@/lib/constants'
import type { Category, Wallet } from '@/lib/types'

export interface TransactionFilterValue {
  categoryIds: string[]
  walletIds: string[]
}

export const NO_FILTER: TransactionFilterValue = { categoryIds: [], walletIds: [] }

interface Option { id: string; label: string; icon: string; color: string }

const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter(x => x !== id) : [...list, id])

// Filtros de Transações: categorias e forma de pagamento (carteira), com várias escolhas em cada um.
export function TransactionFilters({ value, onChange, categories, wallets }: {
  value: TransactionFilterValue
  onChange: (v: TransactionFilterValue) => void
  categories: Category[]
  wallets: Wallet[]
}) {
  const [open, setOpen] = useState<'category' | 'wallet' | null>(null)

  const expense = categories.filter(c => c.type === 'expense')
  const income = categories.filter(c => c.type === 'income')
  const catOption = (c: Category): Option => ({ id: c.id, label: c.name, icon: c.icon, color: c.color })
  const walletOptions = wallets.map(w => ({
    id: w.id, label: w.ownerName ? `${w.name}, de ${w.ownerName}` : w.name, icon: WALLET_TYPE_ICON[w.type] ?? 'wallet', color: 'gray',
  }))

  const key = open === 'category' ? 'categoryIds' : 'walletIds'
  const selected = open ? value[key] : []
  const pick = (id: string) => onChange({ ...value, [key]: toggle(value[key], id) })
  const groups: { header?: string; options: Option[] }[] = open === 'category'
    ? [{ header: 'Gastos', options: expense.map(catOption) }, { header: 'Receitas', options: income.map(catOption) }]
    : [{ options: walletOptions }]

  return (
    <>
      <div className="flex gap-2">
        <FilterChip label="Categorias" count={value.categoryIds.length} onClick={() => setOpen('category')} />
        <FilterChip label="Pagamento" count={value.walletIds.length} onClick={() => setOpen('wallet')} />
      </div>

      <ModalSheet open={!!open} onOpenChange={o => { if (!o) setOpen(null) }}
        title={open === 'category' ? 'Categorias' : 'Pagamento'}>
        {groups.filter(g => g.options.length).map(g => (
          <ListGroup key={g.header ?? 'all'} header={g.header}>
            <li className="flex flex-wrap gap-2 p-3">
              {g.options.map(o => {
                const on = selected.includes(o.id)
                return (
                  <ChoiceChip key={o.id} selected={on} onClick={() => pick(o.id)} className="pl-1">
                    <TokenIcon active={on} icon={o.icon} color={o.color} size="sm" />{o.label}
                  </ChoiceChip>
                )
              })}
            </li>
          </ListGroup>
        ))}
        <Button variant="secondary" size="lg" className="w-full" disabled={!selected.length}
          onClick={() => onChange({ ...value, [key]: [] })}>
          Limpar
        </Button>
      </ModalSheet>
    </>
  )
}

function FilterChip({ label, count, onClick }: { label: string; count: number; onClick: () => void }) {
  return (
    <ChoiceChip size="sm" selected={count > 0} onClick={onClick}>
      {count > 0 ? `${label} · ${count}` : label}
      <AltArrowDownLinearIcon className="size-4" />
    </ChoiceChip>
  )
}
