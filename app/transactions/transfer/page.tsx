import { PageHeader } from '@/components/layout/page-header'
import { TransferForm } from '@/components/transactions/transfer-form'

export default function TransferPage() {
  return (
    <>
      <PageHeader title="Transferir entre contas" back />
      <div className="p-4">
        <TransferForm />
      </div>
    </>
  )
}
