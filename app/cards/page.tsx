'use client'

import { useRouter } from 'next/navigation'
import { DueBadge } from '@/components/bills/due-badge'
import { PersonRow } from '@/components/cards/person-row'
import { SummaryCard } from '@/components/cards/summary-card'
import { LargeTitleHeader } from '@/components/ios/large-title-header'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { LoadingBlock } from '@/components/shared/loading-dots'
import { TokenIcon } from '@/components/shared/token-icon'
import { useCardInvoices } from '@/hooks/use-card-invoices'
import { nextBusinessDay } from '@/lib/business-days'
import { currentMonth, formatCurrency, formatDate, walletLabel } from '@/lib/utils'
import { Money } from '@/components/shared/money'

// Faturas do mês: meus cartões (um por linha) e cartões compartilhados (uma linha por pessoa).
export default function CardsPage() {
  const router = useRouter()
  // tela principal: sempre o mês atual, sem seletor de mês
  const month = currentMonth()
  const { mine, owe, receive, toPay, toReceive, loading } = useCardInvoices(month)
  const empty = mine.length === 0 && owe.length === 0 && receive.length === 0

  return (
    <>
      <LargeTitleHeader title="Cartões" />
      <div className="space-y-7 px-4 pt-2">
        {loading ? (
          <LoadingBlock />
        ) : empty ? (
          <div className="py-10 text-center">
            <p className="text-headline">Nenhuma fatura neste mês</p>
            <p className="text-subheadline text-muted-foreground">Cartões ficam em Ajustes &gt; Carteiras</p>
          </div>
        ) : (
          <>
            <SummaryCard rows={[
              { label: 'A pagar', value: toPay },
              ...(receive.length > 0 ? [{ label: 'A receber', value: toReceive, tone: 'success' as const }] : []),
            ]} />

            {mine.length > 0 && (
              <ListGroup header={`Meus cartões · ${mine.length}`}>
                {mine.map(i => {
                  const left = i.paid ? i.amount : i.amount - i.paidAmount
                  const none = i.amount === 0 && !i.paid
                  return (
                    <ListRow
                      key={i.wallet.id}
                      onClick={() => router.push(`/cards/${i.wallet.id}?fatura=${i.inv.ref}`)}
                      leading={<TokenIcon icon="credit-card" color="gray" />}
                      title={walletLabel(i.wallet)}
                      subtitle={none ? 'Sem compras nesta fatura' : (
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span className="truncate">
                            Vence {formatDate(i.inv.dueDate).slice(0, 5)}
                            {!i.paid && i.paidAmount > 0 && ` · ${formatCurrency(i.paidAmount)} pago`}
                          </span>
                          <DueBadge dueDate={nextBusinessDay(i.inv.dueDate)} paid={i.paid} />
                        </span>
                      )}
                      trailing={
                        <Money cents={left} tone={none ? 'muted' : 'default'} />
                      }
                      chevron
                    />
                  )
                })}
              </ListGroup>
            )}

            {owe.length > 0 && (
              <ListGroup header={`Repassar · ${formatCurrency(owe.reduce((s, g) => s + g.open, 0))}`}>
                {owe.map(g => <PersonRow key={g.id} group={g} kind="owe" onClick={() => router.push(`/cards/pessoa/${g.id}`)} />)}
              </ListGroup>
            )}

            {receive.length > 0 && (
              <ListGroup header={`A receber · ${formatCurrency(toReceive)}`}>
                {receive.map(g => <PersonRow key={g.id} group={g} kind="receive" onClick={() => router.push(`/cards/pessoa/${g.id}`)} />)}
              </ListGroup>
            )}
          </>
        )}
      </div>
    </>
  )
}
