'use client'

import type { Category, Transaction } from '@/lib/types'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { TokenIcon } from '@/components/shared/token-icon'
import { RepeatBoldDuotoneIcon } from '@solar-icons/react'

interface TransactionItemProps {
  transaction: Transaction
  category?: Category
  onClick?: () => void
}

export function TransactionItem({ transaction, category, onClick }: TransactionItemProps) {
  const isIncome = transaction.type === 'income'
  const isTransfer = transaction.type === 'transfer'
  const isInstallment = transaction.installmentNumber !== null && transaction.installmentTotal !== null
  const isRecurring = !!transaction.recurringGroupId

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 py-3 text-left"
    >
      {category ? (
        <TokenIcon icon={category.icon} color={category.color} size="md" />
      ) : (
        <div className="size-9 shrink-0 rounded-full bg-muted" />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate font-medium">{transaction.description}</p>
          {isRecurring && <RepeatBoldDuotoneIcon className="size-3.5 shrink-0 text-muted-foreground" />}
        </div>
        <p className="text-xs text-muted-foreground">
          {formatDate(transaction.date)}
          {isInstallment && ` · Parcela ${transaction.installmentNumber}/${transaction.installmentTotal}`}
          {category && ` · ${category.name}`}
        </p>
      </div>

      <p
        className={cn(
          'shrink-0 font-semibold',
          isIncome && 'text-green-600',
          !isIncome && !isTransfer && 'text-red-600',
          isTransfer && 'text-blue-600',
        )}
      >
        {isIncome ? '+' : isTransfer ? '' : '-'}
        {formatCurrency(transaction.amount)}
      </p>
    </button>
  )
}
