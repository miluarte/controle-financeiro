'use client'

import Link from 'next/link'
import { useTransactions } from '@/hooks/use-transactions'
import { TransactionItem } from './transaction-item'
import { Separator } from '@/components/ui/separator'

export function TransactionList() {
  const { transactions, loading, error } = useTransactions()

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>
  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (transactions.length === 0)
    return <p className="text-sm text-muted-foreground">Nenhuma transação neste período.</p>

  return (
    <div className="divide-y">
      {transactions.map((tx, i) => (
        <div key={tx.id}>
          <Link href={`/transactions/${tx.id}`}>
            <TransactionItem transaction={tx} />
          </Link>
          {i < transactions.length - 1 && <Separator />}
        </div>
      ))}
    </div>
  )
}
