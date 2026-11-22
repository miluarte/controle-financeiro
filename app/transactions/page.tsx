'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { LargeTitleHeader } from '@/components/ios/large-title-header'
import { SearchField } from '@/components/ios/search-field'
import { MonthSelector } from '@/components/shared/month-selector'
import { TransactionDayList } from '@/components/transactions/transaction-day-list'
import { DuplicatesSheet } from '@/components/transactions/duplicates-sheet'
import { TransactionEditSheet } from '@/components/transactions/transaction-edit-sheet'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { findDuplicates } from '@/lib/duplicates'
import { TransactionsSummary } from '@/components/transactions/transactions-summary'
import { useCategories } from '@/hooks/use-categories'
import { useMonth } from '@/hooks/use-month'
import { useMonthTransactions } from '@/hooks/use-month-transactions'
import { useWallets } from '@/hooks/use-wallets'
import type { Transaction } from '@/lib/types'
import { LoadingBlock } from '@/components/shared/loading-dots'
import { matchesFilters, NO_FILTER, TransactionFilters } from '@/components/transactions/transaction-filters'
import { senderOf } from '@/components/transactions/sender-field'

function normalize(s: string) {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

// ?pagamento=id1,id2&mes=AAAA-MM abre já filtrado (ex.: "Você deve a …" da Home, com o mês das compras).
export default function TransactionsPage() {
  return <Suspense><TransactionsContent /></Suspense>
}

function TransactionsContent() {
  const params = useSearchParams()
  const { month, setMonth } = useMonth()
  const linkMonth = params.get('mes')
  useEffect(() => { if (linkMonth) setMonth(linkMonth) }, [linkMonth, setMonth])
  const { transactions, loading } = useMonthTransactions(month)
  const { categories } = useCategories()
  const { wallets } = useWallets()
  const [query, setQuery] = useState('')
  const [extra, setExtra] = useState(() => ({ ...NO_FILTER, walletIds: params.get('pagamento')?.split(',').filter(Boolean) ?? [] }))
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [showDuplicates, setShowDuplicates] = useState(false)
  const duplicates = useMemo(() => findDuplicates(transactions), [transactions])

  const visible = useMemo(() => {
    const q = normalize(query.trim())
    const catName = new Map(categories.map(c => [c.id, c.name]))
    const walletName = new Map(wallets.map(w => [w.id, w.name]))
    return transactions.filter(t => {
      if (!matchesFilters(t, extra)) return false
      if (!q) return true
      const itemNames = Array.isArray(t.sourceData?.items) ? (t.sourceData.items as { name: string }[]).map(i => i.name) : []
      const hay = [t.place, t.description, t.categoryId && catName.get(t.categoryId), t.walletId && walletName.get(t.walletId), ...itemNames, senderOf(t.sourceData)?.name]
        .filter(Boolean).join(' ')
      return normalize(hay).includes(q)
    })
  }, [transactions, query, categories, wallets, extra])

  return (
    <>
      <LargeTitleHeader title="Transações" actions={<MonthSelector />} />
      <div className="space-y-5 px-4 pt-2">
        <SearchField placeholder="Buscar local, item, categoria" value={query} onChange={e => setQuery(e.target.value)} />
        <TransactionFilters value={extra} onChange={setExtra} categories={categories} wallets={wallets} />
        {duplicates.length > 0 && (
          <ListGroup>
            <ListRow chevron onClick={() => setShowDuplicates(true)}
              title={`${duplicates.length} ${duplicates.length === 1 ? 'compra parece repetida' : 'compras parecem repetidas'}`} />
          </ListGroup>
        )}
        <TransactionsSummary transactions={visible} />
        {loading ? (
          <LoadingBlock />
        ) : (
          <TransactionDayList transactions={visible} onSelect={setEditing} />
        )}
      </div>
      <TransactionEditSheet transaction={editing} onClose={() => setEditing(null)} />
      <DuplicatesSheet open={showDuplicates} pairs={duplicates} onOpenChange={setShowDuplicates} />
    </>
  )
}
