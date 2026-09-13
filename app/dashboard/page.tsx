import { PageHeader } from '@/components/layout/page-header'
import { MonthlySummaryCard } from '@/components/dashboard/monthly-summary-card'
import { QuickActionBar } from '@/components/dashboard/quick-action-bar'
import { TransactionFilters } from '@/components/transactions/transaction-filters'
import { TransactionList } from '@/components/transactions/transaction-list'

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Troco" />
      <div className="space-y-4 p-4">
        <MonthlySummaryCard />
        <QuickActionBar />
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Transações
          </h2>
          <div className="space-y-4">
            <TransactionFilters />
            <TransactionList />
          </div>
        </section>
      </div>
    </>
  )
}
