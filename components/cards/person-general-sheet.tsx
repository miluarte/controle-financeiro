'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { ModalSheet } from '@/components/ios/modal-sheet'
import { EmptyState } from '@/components/shared/empty-state'
import { LoadingBlock } from '@/components/shared/loading-dots'
import { Money } from '@/components/shared/money'
import { TransactionItem } from '@/components/transactions/transaction-item'
import { useCategories } from '@/hooks/use-categories'
import { useProfile } from '@/hooks/use-profile'
import { useSession } from '@/hooks/use-session'
import type { PersonGroup, PersonInvoice } from '@/hooks/use-card-invoices'
import { transactionsApi } from '@/lib/api/transactions'
import { feedback } from '@/lib/feedback'
import { generalStatementPdf, shareOrDownload } from '@/lib/person-statement-pdf'
import type { SharedDebt, Transaction } from '@/lib/types'
import { formatCurrency, formatDate, monthLabel, walletLabel } from '@/lib/utils'
import { displayCategoryMap } from '@/lib/categories'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  personId: string
  name: string
  month: string
  owe?: PersonGroup     // o que eu devo à pessoa (cartões dela e Pix que ela pagou)
  receive?: PersonGroup // o que a pessoa me deve (meus cartões e Pix que eu paguei)
}

type Section = PersonInvoice & { kind: 'owe' | 'receive'; purchases: Transaction[] }

// Fatura geral entre mim e uma pessoa: todas as faturas do mês, de todos os cartões, nos dois sentidos,
// e os gastos divididos. O topo mostra o saldo final (quem deve a quem); o PDF leva tudo.
export function PersonGeneralSheet({ open, onOpenChange, personId, name, month, owe, receive }: Props) {
  return (
    <ModalSheet open={open} onOpenChange={onOpenChange} title="Fatura geral">
      {open && <Body personId={personId} name={name} month={month} owe={owe} receive={receive} />}
    </ModalSheet>
  )
}

function Body({ personId, name, month, owe, receive }: Omit<Props, 'open' | 'onOpenChange'>) {
  const { session } = useSession()
  const me = session?.user.id
  const { profile } = useProfile()
  const myName = profile?.name || 'Você'
  const { categories } = useCategories()
  const catById = displayCategoryMap(categories)
  const [exporting, setExporting] = useState(false)

  const invoices = [
    ...(owe?.invoices ?? []).map(i => ({ ...i, kind: 'owe' as const })),
    ...(receive?.invoices ?? []).map(i => ({ ...i, kind: 'receive' as const })),
  ].sort((a, b) => a.debt.dueDate.localeCompare(b.debt.dueDate))
  const key = invoices.map(i => `${i.wallet.id}:${i.debt.invoiceRef}`).join(',')

  // compras de cada fatura: nos cartões da pessoa, as minhas; nos meus, as dela
  const { data: sections, isLoading } = useSWR(me ? ['person-general', personId, me, key] : null, () =>
    Promise.all(invoices.map(async (i): Promise<Section> => {
      const list = await transactionsApi.getByInvoice(i.wallet.id, i.debt.invoiceRef)
      return { ...i, purchases: list.filter(t => t.owner === (i.kind === 'owe' ? me : personId)) }
    })))

  const pix = [
    ...(owe?.pix ?? []).map(d => ({ d, kind: 'owe' as const })),
    ...(receive?.pix ?? []).map(d => ({ d, kind: 'receive' as const })),
  ].sort((a, b) => a.d.date.localeCompare(b.d.date))

  const oweOpen = owe?.open ?? 0
  const receiveOpen = receive?.open ?? 0
  const balance = receiveOpen - oweOpen
  const balanceText = balance > 0 ? `${name} deve a você` : balance < 0 ? `Você deve a ${name}` : 'Tudo acertado'

  const sectionNote = (s: PersonInvoice & { kind: 'owe' | 'receive' }) =>
    `${s.kind === 'owe' ? `Você deve a ${name}` : `${name} deve a você`} · vence ${formatDate(s.debt.dueDate).slice(0, 5)}`
  const pixNote = (d: SharedDebt, kind: 'owe' | 'receive') =>
    `${kind === 'owe' ? `${name} pagou` : 'Você pagou'} ${formatCurrency(d.total)}`

  async function exportPdf() {
    if (!sections) return
    setExporting(true)
    try {
      const debtor = balance < 0 ? myName : name
      const creditor = balance < 0 ? name : myName
      const blob = await generalStatementPdf({
        title: `Fatura geral de ${name}`,
        subtitle: `Entre ${name} e ${myName} · todos os cartões · vencimentos até ${monthLabel(month)}`,
        balanceLabel: balance === 0 ? 'Tudo acertado' : `${debtor} deve a ${creditor}`,
        balance: Math.abs(balance),
        sections: sections.map(s => {
          const owner = s.kind === 'owe' ? (s.wallet.ownerName ?? name) : myName
          const who = s.kind === 'owe' ? myName : name
          return {
            title: `${walletLabel(s.wallet)} · titular ${owner}`,
            subtitle: `Fatura de ${monthLabel(s.debt.invoiceRef.slice(0, 7))} · vence ${formatDate(s.debt.dueDate)} · compras de ${who}`,
            purchases: s.purchases, total: s.debt.total, settled: s.debt.settled,
          }
        }),
        pix: pix.map(({ d, kind }) => ({
          date: d.date, place: d.place ?? 'Gasto', part: d.part, settled: d.settled,
          note: `${kind === 'owe' ? `${name} pagou, parte de ${myName}` : `${myName} pagou, parte de ${name}`}`,
        })),
      })
      await shareOrDownload(blob, `Fatura geral ${month} - ${name}.pdf`)
    } catch {
      feedback.error('Não foi possível gerar o PDF')
    } finally {
      setExporting(false)
    }
  }

  if (isLoading || !sections) return <LoadingBlock />

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Money as="p" size="display" cents={Math.abs(balance)} />
        <p className="text-subheadline text-muted-foreground">{balanceText}</p>
        {oweOpen > 0 && receiveOpen > 0 && (
          <p className="text-footnote text-muted-foreground">
            {name} deve {formatCurrency(receiveOpen)} · você deve {formatCurrency(oweOpen)}
          </p>
        )}
      </div>

      <Button size="lg" variant="secondary" className="w-full" disabled={exporting} onClick={exportPdf}>Exportar PDF</Button>

      {sections.length === 0 && pix.length === 0 && <EmptyState variant="block">Nada com {name} neste mês</EmptyState>}

      {sections.map(s => (
        <ListGroup key={`${s.wallet.id}-${s.debt.invoiceRef}`}
          header={walletLabel(s.wallet)}
          footer={`${sectionNote(s)} · total ${formatCurrency(s.debt.total)}${s.debt.settled > 0 ? ` · ${formatCurrency(s.debt.settled)} acertado` : ''}`}>
          {s.purchases.length === 0 && <EmptyState>Nenhuma compra nesta fatura.</EmptyState>}
          {s.purchases.map(t => (
            <TransactionItem key={t.id} transaction={t} category={t.categoryId ? catById.get(t.categoryId) : undefined} />
          ))}
        </ListGroup>
      ))}

      {pix.length > 0 && (
        <ListGroup header="Gastos divididos">
          {pix.map(({ d, kind }) => (
            <ListRow key={`${d.sharedPaymentId}-${d.debtorId}`}
              title={d.place ?? 'Gasto'}
              subtitle={`${formatDate(d.date).slice(0, 5)} · ${pixNote(d, kind)}`}
              trailing={<Money cents={d.part} tone={kind === 'receive' ? 'success' : 'default'} />} />
          ))}
        </ListGroup>
      )}
    </div>
  )
}
