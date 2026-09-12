'use client'

import type { Transaction } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface TransactionItemProps {
  transaction: Transaction
}

export function TransactionItem({ transaction }: TransactionItemProps) {
  const isIncome = transaction.type === 'income'
  const isTransfer = transaction.type === 'transfer'

  return (
    <div className="flex items-center justify-between py-3">
      <div className="min-w-0">
        <p className="truncate font-medium">{transaction.description}</p>
        <p className="text-xs text-muted-foreground">{formatDate(transaction.date)}</p>
      </div>
      <p
        className={cn(
          'ml-4 shrink-0 font-semibold',
          isIncome && 'text-green-600',
          !isIncome && !isTransfer && 'text-red-600',
          isTransfer && 'text-blue-600',
        )}
      >
        {isIncome ? '+' : isTransfer ? '' : '-'}
        {formatCurrency(transaction.amount)}
      </p>
    </div>
  )
}
