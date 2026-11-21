'use client'

import { useMemo, useState } from 'react'
import { BillFormSheet } from '@/components/bills/bill-form-sheet'
import { BillOccurrenceSheet } from '@/components/bills/bill-occurrence-sheet'
import { BillsMonthCard } from '@/components/bills/bills-month-card'
import { DueBadge } from '@/components/bills/due-badge'
import { InvoiceSheet, type InvoiceRef } from '@/components/bills/invoice-sheet'
import { SharedInvoiceSheet, type SharedInvoice } from '@/components/bills/shared-invoice-sheet'
import { useMyDebts } from '@/hooks/use-family'
import { useWallets } from '@/hooks/use-wallets'
import { LargeTitleHeader } from '@/components/ios/large-title-header'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { MonthSelector } from '@/components/shared/month-selector'
import { TokenIcon } from '@/components/shared/token-icon'
import { useCategories } from '@/hooks/use-categories'
import { useBills, useInvoices, useOwnWallets } from '@/hooks/use-data'
import { useMonth } from '@/hooks/use-month'
import { nextBusinessDay } from '@/lib/business-days'
import { invoiceDueDate, invoiceRefDueIn } from '@/lib/invoice'
import type { BillOccurrence } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { LoadingBlock } from '@/components/shared/loading-dots'
import { billsApi } from '@/lib/api/bills'
import { useConfirmDelete } from '@/components/ios/use-delete-action'

// amount = valor da conta/fatura; paidAmount = quanto já foi pago (fatura aceita pagamento parcial)
type Item =
  | { kind: 'bill'; due: string; amount: number; paidAmount: number; paid: boolean; o: BillOccurrence }
  | { kind: 'invoice'; due: string; amount: number; paidAmount: number; paid: boolean; inv: InvoiceRef }
  | { kind: 'shared'; due: string; amount: number; paidAmount: number; paid: boolean; inv: SharedInvoice }

export default function BillsPage() {
  const { month } = useMonth()
  const { occurrences, loading } = useBills(month)
  const { totals, paid: paidInvoices, paidAmounts } = useInvoices(month)
  const debts = useMyDebts()
  const { wallets: usable } = useWallets()
  const [openShared, setOpenShared] = useState<SharedInvoice | null>(null)
  const { wallets } = useOwnWallets()
  const { categories } = useCategories()
  const [openBill, setOpenBill] = useState<BillOccurrence | null>(null)
  const [editing, setEditing] = useState<BillOccurrence | null>(null)
  const del = useConfirmDelete()
  const askEnd = (o: BillOccurrence) => del.ask({
    title: o.bill.type === 'income' ? 'Encerrar receita? Os meses recebidos continuam.' : 'Encerrar conta? Os meses pagos continuam.',
    label: 'Encerrar', remove: () => billsApi.endSeries(o.billId, month),
  })
  const [openInvoice, setOpenInvoice] = useState<InvoiceRef | null>(null)
  const catById = new Map(categories.map(c => [c.id, c]))

  const items = useMemo<Item[]>(() => {
    // contas cobradas no cartão já entram na fatura: não são pagas à parte
    const list: Item[] = occurrences.filter(o => o.bill.type === 'expense' && !o.bill.walletId)
      .map(o => ({ kind: 'bill', due: o.dueDate, amount: o.amount, paidAmount: o.paidAt ? o.amount : 0, paid: !!o.paidAt, o }))
    // CON-8: a fatura de cada cartão que vence neste mês entra junto com as contas
    for (const w of wallets.filter(w => w.type === 'credit' && w.active)) {
      const ref = invoiceRefDueIn(w, month)
      const own = totals.filter(t => t.walletId === w.id && t.invoiceRef.slice(0, 7) === ref)
      // o que já foi pago antes (compras antecipadas) sai do valor a pagar
      const total = own.reduce((s, t) => s + t.total - t.prepaid, 0)
      const prepaid = own.reduce((s, t) => s + t.prepaid, 0)
      const paidAt = paidInvoices.find(p => p.walletId === w.id && p.refMonth.slice(0, 7) === ref)?.paidAt ?? null
      if (total === 0 && prepaid === 0 && !paidAt) continue
      const due = invoiceDueDate(w, ref)
      const paidAmount = Math.min(paidAmounts.find(p => p.walletId === w.id && p.invoiceRef === ref)?.paid ?? 0, total)
      const paid = !!paidAt || total - paidAmount <= 0
      list.push({ kind: 'invoice', due, amount: total, paidAmount: paid ? total : paidAmount, paid,
        inv: { wallet: w, ref, dueDate: due, total, prepaid, paidAt, paidAmount } })
    }
    // cartões de outras pessoas da família: o que eu devo na fatura que vence no mês (e atrasadas)
    for (const d of debts) {
      const w = usable.find(x => x.id === d.walletId && x.ownerName)
      if (!w) continue
      const dueMonth = d.dueDate.slice(0, 7)
      if (dueMonth !== month && !(dueMonth < month && d.open > 0)) continue
      list.push({ kind: 'shared', due: d.dueDate, amount: d.total, paidAmount: d.total - d.open, paid: d.open <= 0, inv: { wallet: w, debt: d } })
    }
    return list.sort((a, b) => a.due.localeCompare(b.due))
  }, [occurrences, wallets, totals, paidInvoices, paidAmounts, debts, usable, month])
  const invoices = items.filter((i): i is Exclude<Item, { kind: 'bill' }> => i.kind !== 'bill')
  const bills = items.filter(i => i.kind === 'bill')

  // receitas fixas ficam num grupo à parte e não entram no total de contas
  const incomes = occurrences.filter(o => o.bill.type === 'income')
  const onCard = occurrences.filter(o => o.bill.type === 'expense' && o.bill.walletId)
  const cardName = (id: string | null) => {
    const w = usable.find(x => x.id === id)
    return w ? (w.ownerName ? `${w.name}, de ${w.ownerName}` : w.name) : 'cartão'
  }
  const total = items.reduce((s, i) => s + i.amount, 0)
  const paid = items.reduce((s, i) => s + i.paidAmount, 0)

  return (
    <>
      {del.sheet}
      <LargeTitleHeader
        title="Contas"
        actions={<MonthSelector />}
      />
      <div className="space-y-7 px-4 pt-2">
        <BillsMonthCard total={total} paid={paid} count={items.length} />

        {loading ? (
          <LoadingBlock />
        ) : items.length === 0 && incomes.length === 0 && onCard.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-headline">Nenhuma conta neste mês</p>
            <p className="text-subheadline text-muted-foreground">Toque no + para adicionar</p>
          </div>
        ) : (
          <>
          {invoices.length > 0 && (
            <ListGroup header={`Faturas · ${invoices.length}`}>
              {invoices.map(i => (
                <ListRow
                  key={i.kind === 'invoice' ? `inv-${i.inv.wallet.id}` : `shared-${i.inv.wallet.id}-${i.inv.debt.invoiceRef}`}
                  onClick={() => i.kind === 'invoice' ? setOpenInvoice(i.inv) : setOpenShared(i.inv)}
                  leading={<TokenIcon icon={i.kind === 'shared' ? 'users' : 'credit-card'} color="gray" />}
                  title={i.kind === 'shared' ? `${i.inv.wallet.name}, de ${i.inv.wallet.ownerName}` : i.inv.wallet.name}
                  subtitle={
                    <span className="flex items-center gap-1.5">
                      Vence {formatDate(i.due).slice(0, 5)}
                      {!i.paid && i.paidAmount > 0 && ` · ${formatCurrency(i.paidAmount)} pago`}
                      {!i.paid && i.kind === 'shared' && i.inv.debt.reported > 0 && ` · ${formatCurrency(i.inv.debt.reported)} aguardando`}
                      <DueBadge dueDate={nextBusinessDay(i.due)} paid={i.paid} />
                    </span>
                  }
                  trailing={<span className="text-body font-semibold tabular-nums text-foreground">{formatCurrency(i.paid ? i.amount : i.amount - i.paidAmount)}</span>}
                  chevron
                />
              ))}
            </ListGroup>
          )}
          {bills.length > 0 && (
          <ListGroup header={`Contas · ${bills.length}`}>
            {bills.map(i => {
              if (i.kind !== 'bill') return null
              const cat = i.o.bill.categoryId ? catById.get(i.o.bill.categoryId) : undefined
              const n = i.o.installmentN ? ` · ${i.o.installmentN}/${i.o.bill.installmentsTotal}` : ''
              return (
                <ListRow
                  key={i.o.id}
                  onClick={() => setOpenBill(i.o)}
                  onDelete={() => askEnd(i.o)}
                  leading={<TokenIcon icon={cat?.icon ?? 'ellipsis'} color={cat?.color ?? 'gray'} />}
                  title={i.o.bill.name}
                  subtitle={<span className="flex items-center gap-1.5">Vence {formatDate(i.due).slice(0, 5)}{n} <DueBadge dueDate={i.due} paid={i.paid} /></span>}
                  trailing={<span className="text-body font-semibold tabular-nums text-foreground">{formatCurrency(i.amount)}</span>}
                  chevron
                />
              )
            })}
          </ListGroup>
          )}
          {onCard.length > 0 && (
            <ListGroup header={`No cartão · ${onCard.length}`} footer="Já entram na fatura do cartão.">
              {onCard.map(o => {
                const cat = o.bill.categoryId ? catById.get(o.bill.categoryId) : undefined
                return (
                  <ListRow
                    key={o.id}
                    onClick={() => setOpenBill(o)}
                    onDelete={() => askEnd(o)}
                    leading={<TokenIcon icon={cat?.icon ?? 'ellipsis'} color={cat?.color ?? 'gray'} />}
                    title={o.bill.name}
                    subtitle={`Dia ${formatDate(o.dueDate).slice(0, 5)} · ${cardName(o.bill.walletId)}`}
                    trailing={<span className="text-body tabular-nums text-muted-foreground">{formatCurrency(o.amount)}</span>}
                    chevron
                  />
                )
              })}
            </ListGroup>
          )}
          {incomes.length > 0 && (
            <ListGroup header={`A receber · ${formatCurrency(incomes.reduce((s, o) => s + o.amount, 0))}`}>
              {incomes.map(o => {
                const cat = o.bill.categoryId ? catById.get(o.bill.categoryId) : undefined
                return (
                  <ListRow
                    key={o.id}
                    onClick={() => setOpenBill(o)}
                    onDelete={() => askEnd(o)}
                    leading={<TokenIcon icon={cat?.icon ?? 'ellipsis'} color={cat?.color ?? 'gray'} />}
                    title={o.bill.name}
                    subtitle={<span className="flex items-center gap-1.5">Dia {formatDate(o.dueDate).slice(0, 5)} <DueBadge dueDate={o.dueDate} paid={!!o.paidAt} income /></span>}
                    trailing={<span className="text-body font-semibold tabular-nums text-success">+{formatCurrency(o.amount)}</span>}
                    chevron
                  />
                )
              })}
            </ListGroup>
          )}
          </>
        )}
      </div>
      <BillOccurrenceSheet occurrence={openBill} onClose={() => setOpenBill(null)}
        onEdit={o => { setOpenBill(null); setEditing(o) }} />
      <BillFormSheet open={!!editing} bill={editing?.bill ?? null} onOpenChange={o => { if (!o) setEditing(null) }} />
      <InvoiceSheet invoice={openInvoice} onClose={() => setOpenInvoice(null)} />
      <SharedInvoiceSheet invoice={openShared} onClose={() => setOpenShared(null)} />
    </>
  )
}
