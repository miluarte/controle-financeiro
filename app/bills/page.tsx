'use client'

import { useMemo, useState } from 'react'
import { AddLinearIcon } from '@solar-icons/react'
import { BillFormSheet } from '@/components/bills/bill-form-sheet'
import { BillOccurrenceSheet } from '@/components/bills/bill-occurrence-sheet'
import { BillsMonthCard } from '@/components/bills/bills-month-card'
import { DueBadge } from '@/components/bills/due-badge'
import { InvoiceSheet, type InvoiceRef } from '@/components/bills/invoice-sheet'
import { GlassButton } from '@/components/ios/glass-button'
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
  const [creating, setCreating] = useState(false)
  const [openBill, setOpenBill] = useState<BillOccurrence | null>(null)
  const [openInvoice, setOpenInvoice] = useState<InvoiceRef | null>(null)
  const catById = new Map(categories.map(c => [c.id, c]))

  const items = useMemo<Item[]>(() => {
    const list: Item[] = occurrences.map(o => ({ kind: 'bill', due: o.dueDate, amount: o.amount, paid: !!o.paidAt, o }))
    // CON-8: a fatura de cada cartão que vence neste mês entra junto com as contas
    for (const w of wallets.filter(w => w.type === 'credit' && w.active)) {
      const ref = invoiceRefDueIn(w, month)
      const total = totals.filter(t => t.walletId === w.id && t.invoiceRef.slice(0, 7) === ref).reduce((s, t) => s + t.total, 0)
      const paidAt = paidInvoices.find(p => p.walletId === w.id && p.refMonth.slice(0, 7) === ref)?.paidAt ?? null
      if (total === 0 && !paidAt) continue
      const due = invoiceDueDate(w, ref)
      list.push({ kind: 'invoice', due, amount: total, paid: !!paidAt, inv: { wallet: w, ref, dueDate: due, total, paidAt } })
    }
    return list.sort((a, b) => a.due.localeCompare(b.due))
  }, [occurrences, wallets, totals, paidInvoices, month])

  const total = items.reduce((s, i) => s + i.amount, 0)
  const paid = items.filter(i => i.paid).reduce((s, i) => s + i.amount, 0)

  return (
    <>
      <LargeTitleHeader
        title="Contas"
        actions={<>
          <MonthSelector />
          <GlassButton aria-label="Nova conta" onClick={() => setCreating(true)}><AddLinearIcon /></GlassButton>
        </>}
      />
      <div className="space-y-7 px-4 pt-2">
        <BillsMonthCard total={total} paid={paid} count={items.length} />

        {loading ? (
          <p className="text-subheadline text-muted-foreground">Carregando…</p>
        ) : items.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-headline">Nenhuma conta em {monthName(month)}</p>
            <p className="text-subheadline text-muted-foreground">Toque no + no topo da tela para adicionar</p>
          </div>
        ) : (
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
      </div>
      <BillFormSheet open={creating} onOpenChange={setCreating} />
      <BillOccurrenceSheet occurrence={openBill} onClose={() => setOpenBill(null)} />
      <InvoiceSheet invoice={openInvoice} onClose={() => setOpenInvoice(null)} />
    </>
  )
}
