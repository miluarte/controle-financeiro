'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useAccounts } from '@/hooks/use-accounts'
import { useTransactions } from '@/hooks/use-transactions'
import { AccountCard } from './account-card'
import { buttonVariants } from '@/components/ui/button'
import { AddBoldDuotoneIcon } from '@solar-icons/react'
import { cn, currentMonth } from '@/lib/utils'

export function AccountBalanceList() {
  const { accounts, loading, error } = useAccounts()
  const { transactions } = useTransactions(currentMonth())

  const monthlyExpenseByAccount = useMemo(() => {
    const map: Record<string, number> = {}
    for (const tx of transactions) {
      if (tx.type === 'expense') {
        map[tx.accountId] = (map[tx.accountId] ?? 0) + tx.amount
      }
    }
    return map
  }, [transactions])

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>
  if (error) return <p className="text-sm text-destructive">{error}</p>

  const active = accounts.filter(a => !a.archived)

  return (
    <div className="flex flex-col gap-4">
      {active.map(account => (
        <Link key={account.id} href={`/accounts/${account.id}`} className="block">
          <AccountCard
            account={account}
            monthlyExpense={monthlyExpenseByAccount[account.id] ?? 0}
          />
        </Link>
      ))}
      <Link
        href="/accounts/new"
        className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
      >
        <AddBoldDuotoneIcon className="mr-2 h-4 w-4" />
        Adicionar conta
      </Link>
    </div>
  )
}
