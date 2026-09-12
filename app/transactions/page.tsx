import { PageHeader } from '@/components/layout/page-header'
import { TransactionList } from '@/components/transactions/transaction-list'
import { TransactionFilters } from '@/components/transactions/transaction-filters'

export default function TransactionsPage() {
  return (
    <>
      <PageHeader title="Lançamentos" />
      <div className="p-4 space-y-4">
        <TransactionFilters />
        <TransactionList />
      </div>
    </>
  )
}
