import { PageHeader } from '@/components/layout/page-header'
import { AccountBalanceList } from '@/components/accounts/account-balance-list'

export default function AccountsPage() {
  return (
    <>
      <PageHeader title="Contas" />
      <div className="p-4">
        <AccountBalanceList />
      </div>
    </>
  )
}
