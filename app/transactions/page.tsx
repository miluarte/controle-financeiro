'use client'

import { Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { LargeTitleHeader } from '@/components/ios/large-title-header'
import { SearchField } from '@/components/ios/search-field'
import { Screen } from '@/components/ios/screen'
import { Note } from '@/components/shared/note'
import { TransactionDayList } from '@/components/transactions/transaction-day-list'
import { DuplicatesSheet } from '@/components/transactions/duplicates-sheet'
import { useShowTransaction } from '@/components/transactions/use-show-transaction'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { findDuplicates } from '@/lib/duplicates'
import { TransactionsSummary } from '@/components/transactions/transactions-summary'
import { useCategories } from '@/hooks/use-categories'
import { useMonthTransactions } from '@/hooks/use-month-transactions'
import { useAllMyTransactions } from '@/hooks/use-data'
import { useSession } from '@/hooks/use-session'
import { useWallets } from '@/hooks/use-wallets'
import { LoadingBlock } from '@/components/shared/loading-dots'
import { matchesFilters, NO_FILTER, TransactionFilters } from '@/components/transactions/transaction-filters'
import { senderOf } from '@/components/transactions/sender-field'
import { currentMonth, walletLabel } from '@/lib/utils'
import { matchesQuery } from '@/lib/search'

// ?pagamento=id1,id2&mes=AAAA-MM abre já filtrado (ex.: "Você deve a …" da Home, com o mês das compras).
export default function TransactionsPage() {
  return <Suspense><TransactionsContent /></Suspense>
}

function TransactionsContent() {
  const params = useSearchParams()
  // sem seletor de mês: o mês atual, ou o mês do link (?mes=AAAA-MM)
  const month = params.get('mes') ?? currentMonth()
  const { transactions: monthList, loading: monthLoading } = useMonthTransactions(month)
  const { categories } = useCategories()
  const { wallets } = useWallets()
  const [query, setQuery] = useState('')
  // com texto na busca, procura em todos os lançamentos (todos os meses); sem texto, só no mês escolhido
  const searching = query.trim().length > 0
  const { session } = useSession()
  const all = useAllMyTransactions(searching ? session?.user.id : undefined)
  const allSorted = useMemo(
    () => [...all.transactions].sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt ?? '').localeCompare(a.createdAt ?? '')),
    [all.transactions],
  )
  const transactions = searching ? allSorted : monthList
  const loading = searching ? all.loading : monthLoading
  const [extra, setExtra] = useState(() => ({ ...NO_FILTER, walletIds: params.get('pagamento')?.split(',').filter(Boolean) ?? [] }))
  const showTransaction = useShowTransaction()
  const [showDuplicates, setShowDuplicates] = useState(false)
  const duplicates = useMemo(() => findDuplicates(monthList), [monthList])

  const visible = useMemo(() => {
    const catName = new Map(categories.map(c => [c.id, c.name]))
    const walletName = new Map(wallets.map(w => [w.id, walletLabel(w)]))
    return transactions.filter(t => {
      if (!matchesFilters(t, extra)) return false
      if (!searching) return true
      const itemNames = Array.isArray(t.sourceData?.items) ? (t.sourceData.items as { name: string }[]).map(i => i.name) : []
      return matchesQuery(query, [t.place, t.description, t.categoryId && catName.get(t.categoryId), t.walletId && walletName.get(t.walletId), ...itemNames, senderOf(t.sourceData)?.name], t.amount)
    })
  }, [transactions, query, searching, categories, wallets, extra])

  return (
    <Screen variant="grouped">
      <LargeTitleHeader title="Transações" />
      <div className="space-y-5 px-4 pt-2">
        <SearchField autoFocus={params.get('busca') === '1'} placeholder="Buscar local, item, categoria" value={query} onChange={e => setQuery(e.target.value)} />
        {searching && <Note align="start" className="-mt-3">Em todos os meses</Note>}
        <TransactionFilters value={extra} onChange={setExtra} categories={categories} wallets={wallets} />
        {duplicates.length > 0 && (
          <ListGroup variant="filled">
            <ListRow chevron onClick={() => setShowDuplicates(true)}
              title={`${duplicates.length} ${duplicates.length === 1 ? 'compra parece repetida' : 'compras parecem repetidas'}`} />
          </ListGroup>
        )}
        <TransactionsSummary transactions={visible} tone="filled" />
        {loading ? (
          <LoadingBlock />
        ) : (
          <TransactionDayList transactions={visible} onSelect={showTransaction}
            emptyText={searching ? 'Nada encontrado em nenhum mês' : undefined} />
        )}
      </div>
      <DuplicatesSheet open={showDuplicates} pairs={duplicates} onOpenChange={setShowDuplicates} />
    </Screen>
  )
}
