'use client'

import { ListRow } from '@/components/ios/list-row'
import { TokenIcon } from '@/components/shared/token-icon'
import type { Category, Transaction, Wallet } from '@/lib/types'
import { cn, formatCurrency } from '@/lib/utils'

export const TYPE_LABEL: Record<Transaction['type'], string> = {
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
  onClick?: () => void
  // complemento no subtítulo (ex.: "de Ana" no cartão compartilhado)
  note?: string
}

export function TransactionItem({ transaction: t, category, wallet, onClick, note }: TransactionItemProps) {
  const title = t.place || t.description || category?.name || TYPE_LABEL[t.type]
  const walletName = wallet?.name ?? t.walletNameSnapshot
  const installment = t.installmentN && t.installmentsTotal ? `${t.installmentN} de ${t.installmentsTotal}` : null
  const itemCount = Array.isArray(t.sourceData?.items) ? t.sourceData.items.length : 0
  const items = itemCount ? `${itemCount} ${itemCount === 1 ? 'item' : 'itens'}` : null
  const subtitle = [category?.name ?? TYPE_LABEL[t.type], walletName, installment, items, note].filter(Boolean).join(' · ')
  const inflow = INFLOW.has(t.type)

  return (
    <ListRow
      onClick={onClick}
      leading={
        <TokenIcon
          icon={category?.icon ?? (t.type.startsWith('save') ? 'piggy-bank' : 'ellipsis')}
          color={category?.color ?? 'gray'}
        />
      }
      title={title}
      subtitle={subtitle}
      trailing={
        <span className={cn('text-body font-semibold tabular-nums', inflow ? 'text-success' : 'text-foreground')}>
          {inflow ? '+' : '−'}{formatCurrency(t.amount)}
        </span>
      }
    />
  )
}
