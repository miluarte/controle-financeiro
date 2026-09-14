'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useAccounts } from '@/hooks/use-accounts'
import { useTransactions } from '@/hooks/use-transactions'
import { accountsApi } from '@/lib/api/accounts'
import { AccountCard } from './account-card'
import { Button, buttonVariants } from '@/components/ui/button'
import { AddBoldDuotoneIcon } from '@solar-icons/react'
import { cn, currentMonth } from '@/lib/utils'

export function AccountBalanceList() {
  const { accounts, loading, error, reload } = useAccounts()
  const { transactions } = useTransactions(currentMonth())
  const [restoring, setRestoring] = useState<string | null>(null)
  const [restoreError, setRestoreError] = useState<string | null>(null)

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
  const archived = accounts.filter(a => a.archived)

  async function handleRestore(id: string) {
    setRestoring(id)
    setRestoreError(null)
    try {
      await accountsApi.update({ id, archived: false })
      await reload()
    } catch (e) {
      setRestoreError(e instanceof Error ? e.message : 'Erro ao restaurar conta')
    } finally {
      setRestoring(null)
    }
  }

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

      {archived.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Arquivadas
          </p>
          {restoreError && (
            <p className="text-xs text-destructive">{restoreError}</p>
          )}
          {archived.map(account => (
            <div key={account.id} className="flex items-center justify-between rounded-xl border px-4 py-3">
              <p className="text-sm text-muted-foreground">{account.name}</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={restoring === account.id}
                  onClick={() => handleRestore(account.id)}
                >
                  {restoring === account.id ? 'Restaurando...' : 'Restaurar'}
                </Button>
                <Link
                  href={`/accounts/${account.id}`}
                  className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
                >
                  Editar
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
