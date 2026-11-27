'use client'

import { useState } from 'react'
import { BillOccurrenceSheet } from '@/components/bills/bill-occurrence-sheet'
import { BillsMonthCard } from '@/components/bills/bills-month-card'
import { CardStatement } from '@/components/bills/card-statement'
import { Screen } from '@/components/ios/screen'
import { SegmentedControl } from '@/components/ios/segmented-control'
import { DueBadge } from '@/components/bills/due-badge'
import { useWallets } from '@/hooks/use-wallets'
import { LargeTitleHeader } from '@/components/ios/large-title-header'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { CategoryIcon } from '@/components/shared/category-icon'
import { useCategories } from '@/hooks/use-categories'
import { useBills } from '@/hooks/use-data'
import { useCardChargePaid } from '@/hooks/use-card-charge-paid'
import type { BillOccurrence } from '@/lib/types'
import { currentMonth, formatCurrency, formatDate, walletLabel } from '@/lib/utils'
import { LoadingBlock } from '@/components/shared/loading-dots'
import { useBillDelete } from '@/components/bills/use-bill-delete'
import { QuickAddSheet } from '@/components/transactions/quick-add-sheet'
import { Money } from '@/components/shared/money'

export default function BillsPage() {
  // tela principal: sempre o mês atual, sem seletor de mês
  const month = currentMonth()
  const { occurrences, loading } = useBills(month)
  const { wallets: usable } = useWallets()
  const { categories } = useCategories()
  // Cartões: gasto de todos os cartões somados, por mês. Fixas: só o que é fixo.
  const [view, setView] = useState<'cards' | 'fixed'>('cards')
  const [openBill, setOpenBill] = useState<BillOccurrence | null>(null)
  const [editing, setEditing] = useState<BillOccurrence | null>(null)
  const del = useBillDelete()
  const askEnd = del.ask
  const catById = new Map(categories.map(c => [c.id, c]))

  // Contas mostra só o que é fixo; as faturas dos cartões ficam na aba Cartões.
  // Gastos fixos cobrados no cartão já entram na fatura: não são pagos à parte.
  const bills = occurrences.filter(o => o.bill.type === 'expense' && !o.bill.onCard)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  // receitas fixas ficam num grupo à parte e não entram no total de contas
  const incomes = occurrences.filter(o => o.bill.type === 'income')
  const onCard = occurrences.filter(o => o.bill.type === 'expense' && o.bill.onCard)
  const cardName = (id: string | null) => {
    const w = usable.find(x => x.id === id)
    return w ? (w.ownerName ? `${walletLabel(w)}, de ${w.ownerName}` : walletLabel(w)) : 'cartão'
  }
  // o resumo soma as contas e as fixas no cartão; a fixa no cartão conta como paga quando a fatura dela está paga
  const cardChargePaid = useCardChargePaid(month, onCard)
  const total = [...bills, ...onCard].reduce((s, o) => s + o.amount, 0)
  const paid = bills.reduce((s, o) => s + (o.paidAt ? o.amount : 0), 0)
    + onCard.reduce((s, o) => s + (cardChargePaid(o) ? o.amount : 0), 0)

  return (
    <Screen variant={view === 'cards' ? 'grouped' : 'page'}>
      {del.sheet}
      <LargeTitleHeader title="Contas" />
      <div className="space-y-7 px-4 pt-2">
        <SegmentedControl aria-label="Visão" value={view} onChange={setView}
          options={[{ value: 'cards', label: 'Cartões' }, { value: 'fixed', label: 'Fixas' }]} />
        {view === 'cards' ? <CardStatement /> : <>
        <BillsMonthCard total={total} paid={paid} />

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
              const to = o.bill.recipient ? ` · Para ${o.bill.recipient.name}` : ''
              return (
                <ListRow
                  key={o.id}
                  onClick={() => setOpenBill(o)}
                  onDelete={() => askEnd(o)}
                  leading={<CategoryIcon icon={cat?.icon ?? 'ellipsis'} />}
                  title={o.bill.name}
                  subtitle={<span className="flex min-w-0 items-center gap-1.5"><span className="truncate">Vence {formatDate(o.dueDate).slice(0, 5)}{n}{to}</span> <DueBadge dueDate={o.dueDate} paid={!!o.paidAt} /></span>}
                  trailing={<Money cents={o.amount} />}
                  chevron
                />
              )
            })}
          </ListGroup>
          )}
          {onCard.length > 0 && (
            <ListGroup header={`Fixas no cartão · ${onCard.length}`} footer="Contam como pagas quando a fatura ou a própria cobrança é paga.">
              {onCard.map(o => {
                const cat = o.bill.categoryId ? catById.get(o.bill.categoryId) : undefined
                return (
                  <ListRow
                    key={o.id}
                    onClick={() => setOpenBill(o)}
                    onDelete={() => askEnd(o)}
                    leading={<CategoryIcon icon={cat?.icon ?? 'ellipsis'} />}
                    title={o.bill.name}
                    subtitle={`Dia ${formatDate(o.dueDate).slice(0, 5)} · ${cardName(o.bill.walletId)}`}
                    trailing={<Money cents={o.amount} size="rowRegular" tone="muted" />}
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
                    leading={<CategoryIcon tone="success" icon={cat?.icon ?? 'ellipsis'} />}
                    title={o.bill.name}
                    subtitle={<span className="flex items-center gap-1.5">Dia {formatDate(o.dueDate).slice(0, 5)} <DueBadge dueDate={o.dueDate} paid={!!o.paidAt} income /></span>}
                    trailing={<Money cents={o.amount} tone="success" sign="+" />}
                    chevron
                  />
                )
              })}
            </ListGroup>
          )}
          </>
        )}
        </>}
      </div>
      <BillOccurrenceSheet occurrence={openBill} onClose={() => setOpenBill(null)}
        onEdit={o => { setOpenBill(null); setEditing(o) }} />
      {editing && <QuickAddSheet key={editing.id} open editBill={editing} onOpenChange={o => { if (!o) setEditing(null) }} />}
    </Screen>
  )
}
