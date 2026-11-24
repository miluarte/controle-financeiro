'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BillOccurrenceSheet } from '@/components/bills/bill-occurrence-sheet'
import { DueBadge } from '@/components/bills/due-badge'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { TokenIcon } from '@/components/shared/token-icon'
import { QuickAddSheet } from '@/components/transactions/quick-add-sheet'
import { useCategories } from '@/hooks/use-categories'
import { useMonthOutlook, type ToPayItem } from '@/hooks/use-month-outlook'
import type { BillOccurrence } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'

// O que ainda falta pagar no mês, por vencimento: contas fixas, faturas e repasses.
// Tocar abre onde se paga (a conta abre a folha de pagar; fatura e repasse, a tela deles).
export function ToPayList({ month }: { month: string }) {
  const router = useRouter()
  const { items, toPay, loading } = useMonthOutlook(month)
  const { categories } = useCategories()
  const [openBill, setOpenBill] = useState<BillOccurrence | null>(null)
  const [editing, setEditing] = useState<BillOccurrence | null>(null)
  if (loading || items.length === 0) return null

  function leading(i: ToPayItem) {
    if (i.kind === 'invoice') return <TokenIcon icon="credit-card" color="gray" />
    if (i.kind === 'person') return <TokenIcon icon="users" color="gray" />
    const cat = categories.find(c => c.id === i.occurrence.bill.categoryId)
    return <TokenIcon icon={cat?.icon ?? 'bill'} color={cat?.color ?? 'gray'} />
  }

  return (
    <>
      <ListGroup header={`A pagar · ${formatCurrency(toPay)}`}>
        {items.map(i => (
          <ListRow
            key={i.id}
            onClick={() => (i.kind === 'bill' ? setOpenBill(i.occurrence) : router.push(i.href))}
            leading={leading(i)}
            title={i.title}
            subtitle={
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="truncate">Vence {formatDate(i.dueDate).slice(0, 5)}</span>
                <DueBadge dueDate={i.dueDate} paid={false} />
              </span>
            }
            trailing={<span className="text-body font-semibold tabular-nums text-foreground">{formatCurrency(i.amount)}</span>}
            chevron
          />
        ))}
      </ListGroup>
      <BillOccurrenceSheet occurrence={openBill} onClose={() => setOpenBill(null)}
        onEdit={o => { setOpenBill(null); setEditing(o) }} />
      {editing && <QuickAddSheet key={editing.id} open editBill={editing} onOpenChange={o => { if (!o) setEditing(null) }} />}
    </>
  )
}
