import { PageHeader } from '@/components/layout/page-header'
import { InstallmentList } from '@/components/installments/installment-list'

export default function InstallmentsPage() {
  return (
    <>
      <PageHeader title="Parcelamentos" />
      <div className="p-4">
        <InstallmentList />
      </div>
    </>
  )
}
