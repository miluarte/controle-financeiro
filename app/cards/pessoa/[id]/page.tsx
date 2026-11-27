'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ConfirmSettlementSheet } from '@/components/cards/confirm-settlement-sheet'
import { PersonGeneralSheet } from '@/components/cards/person-general-sheet'
import { InvoiceStatus, PixStatus } from '@/components/cards/invoice-status'
import { SharedPixSheet } from '@/components/cards/shared-pix-sheet'
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
import type { Settlement, SharedDebt, Wallet } from '@/lib/types'
import { formatCurrency, formatDate, monthName, walletLabel } from '@/lib/utils'
import { Money } from '@/components/shared/money'
import { EmptyState } from '@/components/shared/empty-state'

// Uma pessoa da família: o que eu repasso nos cartões dela e o que ela me deve nos meus, fatura por fatura,
// e os Pix divididos entre nós (quem pagou e quem deve). "Ver fatura geral" junta tudo numa fatura só.
export default function PersonCardsPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { month } = useMonth()
  const { owe, receive, settlements, loading } = useCardInvoices(month)
  const [openShared, setOpenShared] = useState<SharedInvoice | null>(null)
  const [confirming, setConfirming] = useState<Settlement | null>(null)
  const [openPix, setOpenPix] = useState<SharedDebt | null>(null)
  const [general, setGeneral] = useState(false)
  const toOwe = owe.find(g => g.id === id)
  const toReceive = receive.find(g => g.id === id)
  const name = toOwe?.name ?? toReceive?.name ?? 'Pessoa'
  const waiting = settlements.filter(s => s.status === 'reported' && s.debtorId === id)

  const row = (i: PersonInvoice, kind: 'owe' | 'receive', onClick: () => void) => (
    <ListRow
      key={`${i.wallet.id}-${i.debt.invoiceRef}`}
      onClick={onClick}
      leading={<TokenIcon icon="credit-card" color="gray" />}
      title={walletLabel(i.wallet)}
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
        <Money cents={i.debt.open > 0 ? i.debt.open : i.debt.total} tone={kind === 'receive' && i.debt.open > 0 ? 'success' : 'default'} />
      }
      chevron
    />
  )

  const pixRow = (d: SharedDebt, kind: 'owe' | 'receive') => (
    <ListRow
      key={`${d.sharedPaymentId}-${d.debtorId}`}
      onClick={() => setOpenPix(d)}
      leading={<TokenIcon icon="wallet" color="gray" />}
      title={d.place ?? 'Gasto'}
      subtitle={
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate">
            {formatDate(d.date).slice(0, 5)} · Pix de {formatCurrency(d.total)}
            {d.open > 0 && d.settled > 0 && ` · ${formatCurrency(d.settled)} acertado`}
          </span>
          <PixStatus debt={d} kind={kind} />
        </span>
      }
      trailing={
        <Money cents={d.open > 0 ? d.open : d.part} tone={kind === 'receive' && d.open > 0 ? 'success' : 'default'} />
      }
      chevron
    />
  )
  const pix = [...(toOwe?.pix ?? []).map(d => pixRow(d, 'owe')), ...(toReceive?.pix ?? []).map(d => pixRow(d, 'receive'))]

  return (
    <>
      <LargeTitleHeader title={name} actions={<MonthSelector />} />
      <div className="space-y-7 px-4 pt-2">
        {loading ? <LoadingBlock /> : !toOwe && !toReceive ? (
          <EmptyState variant="block">Nada com {name} neste mês</EmptyState>
        ) : (
          <>
            <SummaryCard rows={[
              ...(toOwe ? [{ label: 'Você repassa', value: toOwe.open }] : []),
              ...(toReceive ? [{ label: 'A receber', value: toReceive.open, tone: 'success' as const }] : []),
            ]} />
            <Button size="lg" variant="secondary" className="w-full" onClick={() => setGeneral(true)}>Ver fatura geral</Button>

            {toOwe && toOwe.invoices.length > 0 && (
              <ListGroup header={`Cartões de ${name}`}>
                {toOwe.invoices.map(i => row(i, 'owe', () => setOpenShared({ wallet: i.wallet as Wallet, debt: i.debt })))}
              </ListGroup>
            )}

            {waiting.length > 0 && (
              <ListGroup header="Acertos para confirmar">
                {waiting.map(st => (
                  <ListRow key={st.id} onClick={() => setConfirming(st)} chevron
                    title={`${name} pagou ${formatCurrency(st.amount)}`}
                    subtitle={`${st.invoiceRef ? `Fatura de ${monthName(st.invoiceRef.slice(0, 7))}` : 'Gasto dividido'}${st.paidOn ? ` · em ${formatDate(st.paidOn)}` : ''}`} />
                ))}
              </ListGroup>
            )}

            {pix.length > 0 && <ListGroup header="Gastos divididos">{pix}</ListGroup>}

            {toReceive && toReceive.invoices.length > 0 && (
              <ListGroup header="Meus cartões">
                {toReceive.invoices.map(i => row(i, 'receive',
                  () => router.push(`/cards/${i.wallet.id}?fatura=${i.debt.invoiceRef.slice(0, 7)}`)))}
              </ListGroup>
            )}
          </>
        )}
      </div>
      <SharedInvoiceSheet invoice={openShared} onClose={() => setOpenShared(null)} />
      <PersonGeneralSheet open={general} onOpenChange={setGeneral} personId={id} name={name} month={month}
        owe={toOwe} receive={toReceive} />
      <SharedPixSheet debt={openPix} onClose={() => setOpenPix(null)} />
      <ConfirmSettlementSheet settlement={confirming} debtorName={name} onClose={() => setConfirming(null)} />
    </>
  )
}
