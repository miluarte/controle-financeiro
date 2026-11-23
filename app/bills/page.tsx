'use client'

import { useState } from 'react'
import { BillFormSheet } from '@/components/bills/bill-form-sheet'
import { BillOccurrenceSheet } from '@/components/bills/bill-occurrence-sheet'
import { BillsMonthCard } from '@/components/bills/bills-month-card'
import { DueBadge } from '@/components/bills/due-badge'
import { useWallets } from '@/hooks/use-wallets'
import { LargeTitleHeader } from '@/components/ios/large-title-header'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { MonthSelector } from '@/components/shared/month-selector'
import { TokenIcon } from '@/components/shared/token-icon'
import { useCategories } from '@/hooks/use-categories'
import { useBills } from '@/hooks/use-data'
import { useMonth } from '@/hooks/use-month'
import type { BillOccurrence } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { LoadingBlock } from '@/components/shared/loading-dots'
import { billsApi } from '@/lib/api/bills'
import { useConfirmDelete } from '@/components/ios/use-delete-action'

export default function BillsPage() {
  const { month } = useMonth()
  const { occurrences, loading } = useBills(month)
  const { wallets: usable } = useWallets()
  const { categories } = useCategories()
  const [openBill, setOpenBill] = useState<BillOccurrence | null>(null)
  const [editing, setEditing] = useState<BillOccurrence | null>(null)
  const del = useConfirmDelete()
  const askEnd = (o: BillOccurrence) => del.ask({
    title: o.bill.type === 'income' ? 'Encerrar receita? Os meses recebidos continuam.' : 'Encerrar conta? Os meses pagos continuam.',
    label: 'Encerrar', remove: () => billsApi.endSeries(o.billId, month),
  })
  const catById = new Map(categories.map(c => [c.id, c]))

  // Contas mostra só o que é fixo; as faturas dos cartões ficam na aba Cartões.
  // Contas cobradas no cartão já entram na fatura: não são pagas à parte.
  const bills = occurrences.filter(o => o.bill.type === 'expense' && !o.bill.walletId)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  // receitas fixas ficam num grupo à parte e não entram no total de contas
  const incomes = occurrences.filter(o => o.bill.type === 'income')
  const onCard = occurrences.filter(o => o.bill.type === 'expense' && o.bill.walletId)
  const cardName = (id: string | null) => {
    const w = usable.find(x => x.id === id)
    return w ? (w.ownerName ? `${w.name}, de ${w.ownerName}` : w.name) : 'cartão'
  }
  // o resumo soma tudo o que a lista de contas mostra, inclusive as fixas no cartão
  const onCardTotal = onCard.reduce((s, o) => s + o.amount, 0)
  const total = bills.reduce((s, o) => s + o.amount, 0) + onCardTotal
  const paid = bills.reduce((s, o) => s + (o.paidAt ? o.amount : 0), 0)

  return (
    <>
      {del.sheet}
      <LargeTitleHeader
        title="Contas"
        actions={<MonthSelector />}
      />
      <div className="space-y-7 px-4 pt-2">
        <BillsMonthCard total={total} paid={paid} onCard={onCardTotal} count={bills.length + onCard.length} />

        {loading ? (
          <LoadingBlock />
        ) : bills.length === 0 && incomes.length === 0 && onCard.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-headline">Nenhuma conta neste mês</p>
            <p className="text-subheadline text-muted-foreground">Toque no + para adicionar</p>
          </div>
        ) : (
          <>
          {bills.length > 0 && (
          <ListGroup header={`Contas · ${bills.length}`}>
            {bills.map(o => {
              const cat = o.bill.categoryId ? catById.get(o.bill.categoryId) : undefined
              const n = o.installmentN ? ` · ${o.installmentN}/${o.bill.installmentsTotal}` : ''
              return (
                <ListRow
                  key={o.id}
                  onClick={() => setOpenBill(o)}
                  onDelete={() => askEnd(o)}
                  leading={<TokenIcon icon={cat?.icon ?? 'ellipsis'} color={cat?.color ?? 'gray'} />}
                  title={o.bill.name}
                  subtitle={<span className="flex items-center gap-1.5">Vence {formatDate(o.dueDate).slice(0, 5)}{n} <DueBadge dueDate={o.dueDate} paid={!!o.paidAt} /></span>}
                  trailing={<span className="text-body font-semibold tabular-nums text-foreground">{formatCurrency(o.amount)}</span>}
                  chevron
                />
              )
            })}
          </ListGroup>
          )}
          {onCard.length > 0 && (
            <ListGroup header={`Fixas no cartão · ${onCard.length}`} footer="Somam no total e já entram na fatura.">
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
    </>
  )
}
