'use client'

import { useMemo, useState } from 'react'
import { BillFormSheet } from '@/components/bills/bill-form-sheet'
import { BillOccurrenceSheet } from '@/components/bills/bill-occurrence-sheet'
import { BillsMonthCard } from '@/components/bills/bills-month-card'
import { DueBadge } from '@/components/bills/due-badge'
import { InvoiceSheet, type InvoiceRef } from '@/components/bills/invoice-sheet'
import { LargeTitleHeader } from '@/components/ios/large-title-header'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { MonthSelector } from '@/components/shared/month-selector'
import { TokenIcon } from '@/components/shared/token-icon'
import { useCategories } from '@/hooks/use-categories'
import { useBills, useInvoices, useOwnWallets } from '@/hooks/use-data'
import { useMonth } from '@/hooks/use-month'
import { invoiceDueDate, invoiceRefDueIn } from '@/lib/invoice'
import type { BillOccurrence } from '@/lib/types'
import { formatCurrency, formatDate, monthName } from '@/lib/utils'

type Item =
  | { kind: 'bill'; due: string; amount: number; paid: boolean; o: BillOccurrence }
  | { kind: 'invoice'; due: string; amount: number; paid: boolean; inv: InvoiceRef }

export default function BillsPage() {
  const { month } = useMonth()
  const { occurrences, loading } = useBills(month)
  const { totals, paid: paidInvoices } = useInvoices(month)
  const { wallets } = useOwnWallets()
  const { categories } = useCategories()
  const [openBill, setOpenBill] = useState<BillOccurrence | null>(null)
  const [editing, setEditing] = useState<BillOccurrence | null>(null)
  const [openInvoice, setOpenInvoice] = useState<InvoiceRef | null>(null)
  const catById = new Map(categories.map(c => [c.id, c]))

  const items = useMemo<Item[]>(() => {
    const list: Item[] = occurrences.filter(o => o.bill.type === 'expense')
      .map(o => ({ kind: 'bill', due: o.dueDate, amount: o.amount, paid: !!o.paidAt, o }))
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
      list.push({ kind: 'invoice', due, amount: total, paid: !!paidAt || (total === 0 && prepaid > 0), inv: { wallet: w, ref, dueDate: due, total, prepaid, paidAt } })
    }
    return list.sort((a, b) => a.due.localeCompare(b.due))
  }, [occurrences, wallets, totals, paidInvoices, month])

  // receitas fixas ficam num grupo à parte e não entram no total de contas
  const incomes = occurrences.filter(o => o.bill.type === 'income')
  const total = items.reduce((s, i) => s + i.amount, 0)
  const paid = items.filter(i => i.paid).reduce((s, i) => s + i.amount, 0)

  return (
    <>
      <LargeTitleHeader
        title="Contas"
        actions={<MonthSelector />}
      />
      <div className="space-y-7 px-4 pt-2">
        <BillsMonthCard total={total} paid={paid} count={items.length} />

        {loading ? (
          <p className="text-subheadline text-muted-foreground">Carregando…</p>
        ) : items.length === 0 && incomes.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-headline">Nenhuma conta em {monthName(month)}</p>
            <p className="text-subheadline text-muted-foreground">Toque no + na barra de baixo para adicionar</p>
          </div>
        ) : (
          <>
          {items.length > 0 && (
          <ListGroup header={`Este mês · ${items.length}`}>
            {items.map(i => {
              if (i.kind === 'invoice') {
                return (
                  <ListRow
                    key={`inv-${i.inv.wallet.id}`}
                    onClick={() => setOpenInvoice(i.inv)}
                    leading={<TokenIcon icon="credit-card" color="gray" />}
                    title={`Fatura ${i.inv.wallet.name}`}
                    subtitle={<span className="flex items-center gap-1.5">Vence {formatDate(i.due).slice(0, 5)} <DueBadge dueDate={i.due} paid={i.paid} /></span>}
                    trailing={<span className="text-body font-semibold tabular-nums text-foreground">{formatCurrency(i.amount)}</span>}
                    chevron
                  />
                )
              }
              const cat = i.o.bill.categoryId ? catById.get(i.o.bill.categoryId) : undefined
              const n = i.o.installmentN ? ` · ${i.o.installmentN}/${i.o.bill.installmentsTotal}` : ''
              return (
                <ListRow
                  key={i.o.id}
                  onClick={() => setOpenBill(i.o)}
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
          {incomes.length > 0 && (
            <ListGroup header={`A receber · ${formatCurrency(incomes.reduce((s, o) => s + o.amount, 0))}`}>
              {incomes.map(o => {
                const cat = o.bill.categoryId ? catById.get(o.bill.categoryId) : undefined
                return (
                  <ListRow
                    key={o.id}
                    onClick={() => setOpenBill(o)}
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
    </>
  )
}
