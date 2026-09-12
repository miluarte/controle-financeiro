import { PageHeader } from '@/components/layout/page-header'
import { TransactionForm } from '@/components/transactions/transaction-form'

interface Props {
  params: Promise<{ id: string }>
}

export default async function TransactionDetailPage({ params }: Props) {
  const { id } = await params
  return (
    <>
      <PageHeader title={id === 'new' ? 'Novo lançamento' : 'Editar lançamento'} back />
      <div className="p-4">
        <TransactionForm id={id === 'new' ? undefined : id} />
      </div>
    </>
  )
}
