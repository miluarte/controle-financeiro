'use client'

import Link from 'next/link'
import { useAccounts } from '@/hooks/use-accounts'
import { AccountCard } from './account-card'
import { buttonVariants } from '@/components/ui/button'
import { AddIcon } from '@solar-icons/react'
import { cn } from '@/lib/utils'

export function AccountBalanceList() {
  const { accounts, loading, error } = useAccounts()

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>
  if (error) return <p className="text-sm text-destructive">{error}</p>

  const active = accounts.filter(a => !a.archived)

  return (
    <div className="space-y-3">
      {active.map(account => (
        <Link key={account.id} href={`/accounts/${account.id}`}>
          <AccountCard account={account} />
        </Link>
      ))}
      <Link
        href="/accounts/new"
        className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
      >
        <AddIcon className="mr-2 h-4 w-4" />
        Adicionar conta
      </Link>
    </div>
  )
}
