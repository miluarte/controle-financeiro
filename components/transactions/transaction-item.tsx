'use client'

import { senderOf } from './sender-field'
import { PinBoldIcon } from '@solar-icons/react'
import { ListRow } from '@/components/ios/list-row'
import type { SwipeExtra } from '@/components/ios/swipe-actions'
import { TokenIcon } from '@/components/shared/token-icon'
import { useCardPeople } from '@/hooks/use-card-people'
import type { Category, Transaction, Wallet } from '@/lib/types'
import { cn, formatCurrency, walletLabel } from '@/lib/utils'

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
  onDelete?: () => void
  // complemento no subtítulo (ex.: "de Ana" no cartão compartilhado)
  note?: string
  // fixar/desafixar no deslizar; pinned mostra o alfinete ao lado do nome
  swipeExtra?: SwipeExtra
  pinned?: boolean
}

export function TransactionItem({ transaction: t, category, wallet, onClick, onDelete, note, swipeExtra, pinned }: TransactionItemProps) {
  const title = t.place || t.description || category?.name || TYPE_LABEL[t.type]
  const walletName = (wallet ? walletLabel(wallet) : null) ?? t.walletNameSnapshot
  const installment = t.installmentN && t.installmentsTotal ? `${t.installmentN} de ${t.installmentsTotal}` : null
  // subtítulo: só a forma de pagamento e a parcela (categoria fica no ícone; itens e detalhes, ao abrir)
  // receita: quem enviou; gasto no Pix: para quem foi (source_data.sender)
  const sender = senderOf(t.sourceData)?.name
  // Pix dividido: de quem foi o Pix (quando não foi você)
  const { nameOf } = useCardPeople()
  const shared = t.sharedPaymentId ? (t.paidBy && t.paidBy !== t.owner ? `Pago por ${nameOf(t.paidBy)}` : 'Dividido') : null
  const subtitle = [sender ? `${t.type === 'income' ? 'De' : 'Para'} ${sender}` : null, walletName, shared, installment, note].filter(Boolean).join(' · ')
  const inflow = INFLOW.has(t.type)

  return (
    <ListRow
      onClick={onClick}
      onDelete={onDelete}
      swipeExtra={swipeExtra}
      leading={
        <TokenIcon
          icon={category?.icon ?? (t.type.startsWith('save') ? 'piggy-bank' : 'ellipsis')}
          color={category?.color ?? 'gray'}
        />
      }
      title={pinned ? (
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate">{title}</span>
          <PinBoldIcon aria-label="Fixada" className="size-4 shrink-0 text-muted-foreground" />
        </span>
      ) : title}
      subtitle={subtitle}
      trailing={
        <span className={cn('text-body font-semibold tabular-nums', inflow ? 'text-success' : 'text-foreground')}>
          {inflow ? '+' : '−'}{formatCurrency(t.amount)}
        </span>
      }
    />
  )
}
