'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ConfirmSettlementSheet } from '@/components/cards/confirm-settlement-sheet'
import { InvoiceStatus } from '@/components/cards/invoice-status'
import { SummaryCard } from '@/components/cards/summary-card'
import { SharedInvoiceSheet, type SharedInvoice } from '@/components/bills/shared-invoice-sheet'
import { LargeTitleHeader } from '@/components/ios/large-title-header'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { LoadingBlock } from '@/components/shared/loading-dots'
import { MonthSelector } from '@/components/shared/month-selector'
import { TokenIcon } from '@/components/shared/token-icon'
import { useCardInvoices, type PersonInvoice } from '@/hooks/use-card-invoices'
import { useMonth } from '@/hooks/use-month'
import type { Settlement, Wallet } from '@/lib/types'
import { cn, formatCurrency, formatDate, monthName } from '@/lib/utils'

// Uma pessoa da família: o que eu repasso nos cartões dela e o que ela me deve nos meus, fatura por fatura.
export default function PersonCardsPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { month } = useMonth()
  const { owe, receive, settlements, loading } = useCardInvoices(month)
  const [openShared, setOpenShared] = useState<SharedInvoice | null>(null)
  const [confirming, setConfirming] = useState<Settlement | null>(null)
  const toOwe = owe.find(g => g.id === id)
  const toReceive = receive.find(g => g.id === id)
  const name = toOwe?.name ?? toReceive?.name ?? 'Pessoa'
  const waiting = settlements.filter(s => s.status === 'reported' && s.debtorId === id)

  const row = (i: PersonInvoice, kind: 'owe' | 'receive', onClick: () => void) => (
    <ListRow
      key={`${i.wallet.id}-${i.debt.invoiceRef}`}
      onClick={onClick}
      leading={<TokenIcon icon="credit-card" color="gray" />}
      title={i.wallet.name}
      subtitle={
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate">
            Vence {formatDate(i.debt.dueDate).slice(0, 5)}
            {i.debt.open > 0 && i.debt.settled > 0 && ` · ${formatCurrency(i.debt.settled)} acertado`}
          </span>
          <InvoiceStatus debt={i.debt} kind={kind} />
        </span>
      }
      trailing={
        <span className={cn('text-body font-semibold tabular-nums', kind === 'receive' && i.debt.open > 0 ? 'text-success' : 'text-foreground')}>
          {formatCurrency(i.debt.open > 0 ? i.debt.open : i.debt.total)}
        </span>
      }
      chevron
    />
  )

  return (
    <>
      <LargeTitleHeader back title={name} actions={<MonthSelector />} />
      <div className="space-y-7 px-4 pt-2">
        {loading ? <LoadingBlock /> : !toOwe && !toReceive ? (
          <p className="py-10 text-center text-subheadline text-muted-foreground">Nenhuma fatura com {name} neste mês</p>
        ) : (
          <>
            <SummaryCard rows={[
              ...(toOwe ? [{ label: 'Você repassa', value: toOwe.open }] : []),
              ...(toReceive ? [{ label: 'A receber', value: toReceive.open, tone: 'success' as const }] : []),
            ]} />

            {toOwe && (
              <ListGroup header={`Cartões de ${name}`}>
                {toOwe.invoices.map(i => row(i, 'owe', () => setOpenShared({ wallet: i.wallet as Wallet, debt: i.debt })))}
              </ListGroup>
            )}

            {waiting.length > 0 && (
              <ListGroup header="Acertos para confirmar">
                {waiting.map(st => (
                  <ListRow key={st.id} onClick={() => setConfirming(st)} chevron
                    title={`${name} pagou ${formatCurrency(st.amount)}`}
                    subtitle={`Fatura de ${monthName(st.invoiceRef.slice(0, 7))}${st.paidOn ? ` · em ${formatDate(st.paidOn)}` : ''}`} />
                ))}
              </ListGroup>
            )}

            {toReceive && (
              <ListGroup header="Meus cartões">
                {toReceive.invoices.map(i => row(i, 'receive',
                  () => router.push(`/cards/${i.wallet.id}?fatura=${i.debt.invoiceRef.slice(0, 7)}`)))}
              </ListGroup>
            )}
          </>
        )}
      </div>
      <SharedInvoiceSheet invoice={openShared} onClose={() => setOpenShared(null)} />
      <ConfirmSettlementSheet settlement={confirming} debtorName={name} onClose={() => setConfirming(null)} />
    </>
  )
}
