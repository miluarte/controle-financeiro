'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { ModalSheet } from '@/components/ios/modal-sheet'
import { ChoiceChip } from '@/components/shared/choice-chip'
import { LoadingBlock } from '@/components/shared/loading-dots'
import { SettlementSheet } from '@/components/cards/settlement-sheet'
import { TransactionDayList } from '@/components/transactions/transaction-day-list'
import { TransactionEditSheet } from '@/components/transactions/transaction-edit-sheet'
import { useMyDebts } from '@/hooks/use-family'
import { useWallets } from '@/hooks/use-wallets'
import { transactionsApi } from '@/lib/api/transactions'
import { invoiceRefDueIn } from '@/lib/invoice'
import type { Transaction, Wallet } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'

// Quanto eu devo a uma pessoa da família no mês, somando os cartões dela. As compras aparecem juntas;
// o filtro por cartão mostra o detalhe de cada um.
export function PersonDebtView({ ownerId, month }: { ownerId: string; month: string }) {
  const router = useRouter()
  const { wallets } = useWallets()
  const debts = useMyDebts()
  const cards = wallets.filter(w => w.ownerId === ownerId && w.ownerName)
  const name = cards[0]?.ownerName ?? 'titular'
  const [cardId, setCardId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [choosing, setChoosing] = useState(false)
  const [paying, setPaying] = useState<Wallet | null>(null)

  // o que vence até o mês escolhido (inclui atrasadas), por cartão
  const dueBy = (w: Wallet) => debts.filter(d => d.walletId === w.id && d.open > 0 && d.dueDate.slice(0, 7) <= month)
  const owedOn = (w: Wallet) => dueBy(w).reduce((s, d) => s + d.open, 0)
  const total = cards.reduce((s, w) => s + owedOn(w), 0)
  const withDebt = cards.filter(w => owedOn(w) > 0)

  // compras da fatura que vence no mês, em todos os cartões da pessoa
  const { data, isLoading } = useSWR(cards.length ? ['person-invoices', ownerId, month, cards.map(w => w.id).join()] : null, async () => {
    const lists = await Promise.all(cards.map(w => transactionsApi.getByInvoice(w.id, `${invoiceRefDueIn(w, month)}-01`)))
    return lists.flat().sort((a, b) => b.date.localeCompare(a.date))
  })
  const purchases = (data ?? []).filter(t => !cardId || t.walletId === cardId)
  const shown = cardId ? cards.find(w => w.id === cardId) : null

  function pay() {
    if (withDebt.length === 1) setPaying(withDebt[0])
    else setChoosing(true)
  }

  return (
    <div className="space-y-7">
      <section className="space-y-1 rounded-3xl bg-grouped p-4 text-center">
        <p className="text-subheadline text-muted-foreground">
          {shown ? `Você deve a ${name} no ${shown.name}` : `Você deve a ${name}`}
        </p>
        <p className="text-large-title font-bold tabular-nums">{formatCurrency(shown ? owedOn(shown) : total)}</p>
        {total > 0 && <Button size="lg" className="mt-3 w-full" onClick={pay}>Paguei a {name}</Button>}
      </section>

      {cards.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <ChoiceChip size="sm" selected={!cardId} onClick={() => setCardId(null)}>Todos</ChoiceChip>
          {cards.map(w => (
            <ChoiceChip key={w.id} size="sm" selected={cardId === w.id} onClick={() => setCardId(w.id)}>
              {w.name} · {formatCurrency(owedOn(w))}
            </ChoiceChip>
          ))}
        </div>
      )}

      {isLoading ? <LoadingBlock /> : (
        <TransactionDayList transactions={purchases} onSelect={setEditing}
          emptyTitle="Nenhuma compra" emptyText="Nenhuma compra sua na fatura deste mês" />
      )}

      {shown && (
        <ListGroup>
          <ListRow title={`Ver o ${shown.name}`} subtitle="Faturas, acertos e próximas parcelas" chevron onClick={() => router.push(`/cards/${shown.id}`)} />
        </ListGroup>
      )}

      <ModalSheet open={choosing} onOpenChange={setChoosing} title="Qual fatura você pagou?">
        <ListGroup>
          {withDebt.map(w => (
            <ListRow key={w.id} title={w.name} chevron onClick={() => { setChoosing(false); setPaying(w) }}
              trailing={<span className="font-semibold text-foreground">{formatCurrency(owedOn(w))}</span>} />
          ))}
        </ListGroup>
      </ModalSheet>
      {paying && (
        <SettlementSheet open={!!paying} onOpenChange={o => { if (!o) setPaying(null) }} card={paying} debts={dueBy(paying)} />
      )}
      <TransactionEditSheet transaction={editing} onClose={() => setEditing(null)} />
    </div>
  )
}
