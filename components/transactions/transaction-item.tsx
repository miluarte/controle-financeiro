'use client'

import { TokenIcon } from '@/components/shared/token-icon'
import type { Category, Transaction, Wallet } from '@/lib/types'
import { cn, formatCurrency } from '@/lib/utils'

const TYPE_LABEL: Record<Transaction['type'], string> = {
  expense: 'Gasto',
  income: 'Receita',
  save_apply: 'Guardado',
  save_redeem: 'Resgate',
  invoice_payment: 'Pagamento de fatura',
  settlement_payment: 'Acerto',
}

const INFLOW = new Set<Transaction['type']>(['income', 'save_redeem'])

interface TransactionItemProps {
  transaction: Transaction
  category?: Category
  wallet?: Wallet
}

export function TransactionItem({ transaction: t, category, wallet }: TransactionItemProps) {
  const title = t.place || t.description || category?.name || TYPE_LABEL[t.type]
  const walletName = wallet?.name ?? t.walletNameSnapshot
  const installment = t.installmentN && t.installmentsTotal ? `${t.installmentN} de ${t.installmentsTotal}` : null
  const subtitle = [category?.name ?? TYPE_LABEL[t.type], walletName, installment].filter(Boolean).join(' · ')
  const inflow = INFLOW.has(t.type)

  return (
    <li className="flex items-center gap-3 py-2">
      <TokenIcon
        icon={category?.icon ?? (t.type.startsWith('save') ? 'piggy-bank' : 'ellipsis')}
        color={category?.color ?? 'gray'}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <p className={cn('shrink-0 font-semibold', inflow && 'text-success')}>
        {inflow ? '+' : '-'} {formatCurrency(t.amount)}
      </p>
    </li>
  )
}
