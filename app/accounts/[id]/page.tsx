import { PageHeader } from '@/components/layout/page-header'
import { AccountForm } from '@/components/accounts/account-form'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AccountDetailPage({ params }: Props) {
  const { id } = await params
  return (
    <>
      <PageHeader title={id === 'new' ? 'Nova conta' : 'Editar conta'} back />
      <div className="space-y-4 p-4">
        <AccountForm id={id === 'new' ? undefined : id} />
      </div>
    </>
  )
}
