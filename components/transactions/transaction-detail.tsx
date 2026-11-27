'use client'

import { DetailRow } from '@/components/ios/detail-row'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { Money } from '@/components/shared/money'
import { useCardPeople } from '@/hooks/use-card-people'
import { WALLET_TYPES } from '@/lib/constants'
import { discountOf } from '@/lib/discount'
import { invoiceDueDate } from '@/lib/invoice'
import { receiptUrl, type ReceiptItem } from '@/lib/receipt'
import { SPLIT_ALL } from '@/lib/split'
import type { Category, PurchaseInfo, Transaction, Wallet } from '@/lib/types'
import { formatCurrency, shortDate, walletLabel } from '@/lib/utils'
import { senderOf } from './sender-field'
import { TransactionHero } from './transaction-hero'
import { TYPE_LABEL } from './transaction-item'

type Part = { user_id: string; amount: number }
const partsOf = (t: Transaction, key: string) => (Array.isArray(t.sourceData?.[key]) ? (t.sourceData[key] as Part[]) : null)
const numberOf = (t: Transaction, key: string) => (typeof t.sourceData?.[key] === 'number' ? (t.sourceData[key] as number) : null)

const INFLOW = new Set<Transaction['type']>(['income', 'save_redeem'])

// Valor da compra inteira: gasto dividido, o total; compra parcelada ou dividida, todas as parcelas e partes.
export function purchaseTotal(t: Transaction, info: PurchaseInfo | undefined) {
  return numberOf(t, 'shared_total') ?? (info && info.rows > 1 ? info.total : t.amount)
}

// Detalhe de um lançamento (entrada ou saída): o que foi, quanto, quando, onde e como foi pago.
// Só leitura; editar abre o formulário padrão.
export function TransactionDetail({ transaction: t, info, wallet, category, onInstallments }: {
  transaction: Transaction
  info: PurchaseInfo | undefined
  wallet: Wallet | undefined
  category: Category | undefined
  onInstallments: () => void
}) {
  const { me, nameOf } = useCardPeople()
  const inflow = INFLOW.has(t.type)
  const split = partsOf(t, 'split_parts')
  const shared = partsOf(t, 'shared_parts')
  const parts = split ?? shared
  const total = purchaseTotal(t, info)
  const n = info?.installments ?? t.installmentsTotal ?? null
  const sender = senderOf(t.sourceData)
  const discount = discountOf(t.sourceData)
  const items = Array.isArray(t.sourceData?.items) ? (t.sourceData.items as ReceiptItem[]) : []
  const walletName = (wallet ? walletLabel(wallet) : null) ?? t.walletNameSnapshot
  const walletType = WALLET_TYPES.find(w => w.value === wallet?.type)?.label
  const isCard = wallet?.type === 'credit' || wallet?.type === 'debit'
  const due = wallet?.type === 'credit' && t.invoiceRef && wallet.dueDay ? invoiceDueDate(wallet, t.invoiceRef.slice(0, 7)) : null
  const title = t.place || t.description || category?.name || TYPE_LABEL[t.type]

  const tags = [
    t.status === 'pending' && 'Para confirmar',
    t.installmentGroupId && n && n > 1 && 'Compra parcelada',
    split && 'Compra dividida',
    t.sharedPaymentId && 'Gasto dividido',
    t.billId && (t.type === 'income' ? 'Receita fixa' : 'Gasto fixo'),
    t.prepaidBy && 'Antecipada',
  ].filter((tag): tag is string => !!tag)

  return (
    <>
      <TransactionHero
        icon={category?.icon ?? (t.type.startsWith('save') ? 'piggy-bank' : 'ellipsis')}
        title={title} cents={total} inflow={inflow} installments={n} date={info?.firstDate ?? t.date} tags={tags} />

      <ListGroup>
        {t.place && <DetailRow label="Estabelecimento" value={t.place} />}
        {t.description && !t.place && <DetailRow label="Descrição" value={t.description} />}
        {n && n > 1 && t.installmentN && (
          <DetailRow label="Parcelas" value={`${t.installmentN} de ${n} · ${formatCurrency(t.amount)}`} onClick={onInstallments} />
        )}
        {walletName && <DetailRow label={isCard ? 'Cartão' : 'Conta'} value={wallet?.ownerName ? `${walletName} · de ${wallet.ownerName}` : walletName} />}
        {walletType && <DetailRow label="Forma de pagamento" value={walletType} />}
        {due && <DetailRow label="Fatura" value={`Vence em ${shortDate(due)}`} />}
        {category && <DetailRow label="Categoria" value={category.name} />}
        {sender && <DetailRow label={t.type === 'income' ? 'Remetente' : 'Destinatário'} value={sender.name} />}
        {t.paidBy && <DetailRow label="Quem pagou" value={nameOf(t.paidBy)} />}
        {!parts && t.owner !== me && <DetailRow label="De quem é" value={nameOf(t.owner)} />}
        {discount && (
          <DetailRow label="Desconto"
            value={discount.percent ? `${formatCurrency(discount.amount)} (${discount.percent}%)` : formatCurrency(discount.amount)} />
        )}
      </ListGroup>

      {parts && parts.length > 0 && (
        <ListGroup header="Divisão">
          {parts.map(p => (
            <ListRow key={p.user_id} title={nameOf(p.user_id)}
              subtitle={n && n > 1 ? `${n}x de ${formatCurrency(Math.round(Number(p.amount) / n))}` : undefined}
              trailing={<Money cents={Number(p.amount)} size="rowRegular" />} />
          ))}
        </ListGroup>
      )}

      {items.length > 0 && (
        <ListGroup header="Itens da compra">
          {items.map((it, i) => (
            <ListRow key={i} title={it.name}
              subtitle={split && it.owner ? (it.owner === SPLIT_ALL ? 'Dividido' : nameOf(it.owner)) : undefined}
              trailing={<Money cents={it.amount} size="rowRegular" />} />
          ))}
        </ListGroup>
      )}

      {t.receiptPath && (
        <ListGroup>
          <ListRow tone="tint" title="Ver comprovante"
            onClick={async () => { const url = await receiptUrl(t.receiptPath!); if (url) window.open(url, '_blank') }} />
        </ListGroup>
      )}
    </>
  )
}
