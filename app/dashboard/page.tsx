import { PageHeader } from '@/components/layout/page-header'
import { MonthlySummaryCard } from '@/components/dashboard/monthly-summary-card'
import { QuickActionBar } from '@/components/dashboard/quick-action-bar'

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Troco" />
      <div className="space-y-4 p-4">
        <MonthlySummaryCard />
        <QuickActionBar />
      </div>
    </>
  )
}
