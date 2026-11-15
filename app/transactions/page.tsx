'use client'

import { useMemo, useState } from 'react'
import { LargeTitleHeader } from '@/components/ios/large-title-header'
import { SearchField } from '@/components/ios/search-field'
import { SegmentedControl } from '@/components/ios/segmented-control'
import { MonthSelector } from '@/components/shared/month-selector'
import { TransactionDayList } from '@/components/transactions/transaction-day-list'
import { TransactionEditSheet } from '@/components/transactions/transaction-edit-sheet'
import { TransactionsSummary } from '@/components/transactions/transactions-summary'
import { useCategories } from '@/hooks/use-categories'
import { useMonth } from '@/hooks/use-month'
import { useMonthTransactions } from '@/hooks/use-month-transactions'
import { useWallets } from '@/hooks/use-wallets'
import type { Transaction } from '@/lib/types'

type Filter = 'all' | 'expense' | 'income' | 'saved'

const FILTER_TYPES: Record<Filter, Transaction['type'][] | null> = {
  all: null,
  expense: ['expense'],
  income: ['income'],
  saved: ['save_apply', 'save_redeem'],
}

function normalize(s: string) {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

export default function TransactionsPage() {
  const { month } = useMonth()
  const { transactions, loading } = useMonthTransactions(month)
  const { categories } = useCategories()
  const { wallets } = useWallets()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [editing, setEditing] = useState<Transaction | null>(null)

  const visible = useMemo(() => {
    const types = FILTER_TYPES[filter]
    const q = normalize(query.trim())
    const catName = new Map(categories.map(c => [c.id, c.name]))
    const walletName = new Map(wallets.map(w => [w.id, w.name]))
    return transactions.filter(t => {
      if (types && !types.includes(t.type)) return false
      if (!q) return true
      const hay = [t.place, t.description, t.categoryId && catName.get(t.categoryId), t.walletId && walletName.get(t.walletId)]
        .filter(Boolean).join(' ')
      return normalize(hay).includes(q)
    })
  }, [transactions, filter, query, categories, wallets])

  return (
    <>
      <LargeTitleHeader title="Transações" actions={<MonthSelector />} />
      <div className="space-y-5 px-4 pt-2">
        <SearchField placeholder="Buscar local, descrição, categoria" value={query} onChange={e => setQuery(e.target.value)} />
        <SegmentedControl
          aria-label="Filtro"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Todas' },
            { value: 'expense', label: 'Gastos' },
            { value: 'income', label: 'Receitas' },
            { value: 'saved', label: 'Guardado' },
          ]}
        />
        <TransactionsSummary transactions={visible} />
        {loading ? (
          <p className="text-subheadline text-muted-foreground">Carregando…</p>
        ) : (
          <TransactionDayList transactions={visible} onSelect={setEditing} />
        )}
      </div>
      <TransactionEditSheet transaction={editing} onClose={() => setEditing(null)} />
    </>
  )
}
