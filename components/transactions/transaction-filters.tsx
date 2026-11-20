'use client'

import { useState } from 'react'
import { AltArrowDownLinearIcon } from '@solar-icons/react'
import { Button } from '@/components/ui/button'
import { ListGroup } from '@/components/ios/list-group'
import { ModalSheet } from '@/components/ios/modal-sheet'
import { ChoiceChip } from '@/components/shared/choice-chip'
import { TokenIcon } from '@/components/shared/token-icon'
import { WALLET_TYPE_ICON } from '@/lib/constants'
import type { Category, Transaction, Wallet } from '@/lib/types'

// tipos do filtro: gasto, receita e guardado (aplicar e resgatar)
export const TYPE_FILTERS = [
  { id: 'expense', label: 'Gastos', icon: 'cart', types: ['expense'] },
  { id: 'income', label: 'Receitas', icon: 'trending-up', types: ['income'] },
  { id: 'saved', label: 'Guardado', icon: 'piggy-bank', types: ['save_apply', 'save_redeem'] },
] as const satisfies readonly { id: string; label: string; icon: string; types: readonly Transaction['type'][] }[]

export interface TransactionFilterValue {
  types: string[]
  categoryIds: string[]
  walletIds: string[]
}

export const NO_FILTER: TransactionFilterValue = { types: [], categoryIds: [], walletIds: [] }

// o lançamento passa pelos filtros escolhidos (filtro vazio = tudo)
export function matchesFilters(t: Transaction, f: TransactionFilterValue) {
  if (f.types.length && !TYPE_FILTERS.some(o => f.types.includes(o.id) && (o.types as readonly string[]).includes(t.type))) return false
  if (f.categoryIds.length && !(t.categoryId && f.categoryIds.includes(t.categoryId))) return false
  if (f.walletIds.length && !(t.walletId && f.walletIds.includes(t.walletId))) return false
  return true
}

type FilterKey = 'types' | 'categoryIds' | 'walletIds'
const TITLES: Record<FilterKey, string> = { types: 'Tipo', categoryIds: 'Categorias', walletIds: 'Pagamento' }

interface Option { id: string; label: string; icon: string; color: string }

const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter(x => x !== id) : [...list, id])

// Filtros de Transações: tipo, categorias e forma de pagamento (carteira), com várias escolhas em cada um.
export function TransactionFilters({ value, onChange, categories, wallets }: {
  value: TransactionFilterValue
  onChange: (v: TransactionFilterValue) => void
  categories: Category[]
  wallets: Wallet[]
}) {
  const [open, setOpen] = useState<FilterKey | null>(null)

  const expense = categories.filter(c => c.type === 'expense')
  const income = categories.filter(c => c.type === 'income')
  const catOption = (c: Category): Option => ({ id: c.id, label: c.name, icon: c.icon, color: c.color })
  const walletOptions = wallets.map(w => ({
    id: w.id, label: w.ownerName ? `${w.name}, de ${w.ownerName}` : w.name, icon: WALLET_TYPE_ICON[w.type] ?? 'wallet', color: 'gray',
  }))

  const key = open ?? 'types'
  const selected = open ? value[key] : []
  const pick = (id: string) => onChange({ ...value, [key]: toggle(value[key], id) })
  const groups: { header?: string; options: Option[] }[] =
    open === 'categoryIds' ? [{ header: 'Gastos', options: expense.map(catOption) }, { header: 'Receitas', options: income.map(catOption) }]
    : open === 'walletIds' ? [{ options: walletOptions }]
    : [{ options: TYPE_FILTERS.map(o => ({ id: o.id, label: o.label, icon: o.icon, color: 'gray' })) }]

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(TITLES) as FilterKey[]).map(k => (
          <FilterChip key={k} label={TITLES[k]} count={value[k].length} onClick={() => setOpen(k)} />
        ))}
      </div>

      <ModalSheet open={!!open} onOpenChange={o => { if (!o) setOpen(null) }}
        title={TITLES[key]}>
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
