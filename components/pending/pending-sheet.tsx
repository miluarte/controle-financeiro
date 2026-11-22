'use client'

import { useState } from 'react'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { ModalSheet } from '@/components/ios/modal-sheet'
import type { Transaction } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { QuickAddSheet } from '@/components/transactions/quick-add-sheet'
import { transactionsApi } from '@/lib/api/transactions'
import { useConfirmDelete } from '@/components/ios/use-delete-action'
import { useCardPeople } from '@/hooks/use-card-people'
import { ChooseCardSheet } from './choose-card-sheet'
import { senderOf } from '@/components/transactions/sender-field'

const SOURCE_LABEL: Record<string, string> = { apple_pay: 'Apple Pay', back_tap: 'Toque duplo', notification: 'SMS do banco', pix: 'Pix' }

// Fila de pendentes: o que chegou pelas automações, compras sem cartão definido e, para o titular,
// compras da família no cartão dele esperando ele dizer qual cartão foi.
// Tocar abre o registro de gasto já preenchido (ou, para o titular, "Qual cartão foi?").
export function PendingSheet({ open, pending, onOpenChange }: {
  open: boolean; pending: Transaction[]; onOpenChange: (o: boolean) => void
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const del = useConfirmDelete()
  const { me, nameOf } = useCardPeople()
  const selected = pending.find(t => t.id === selectedId) ?? (pending.length === 1 ? pending[0] : null)
  // compra de outra pessoa no meu cartão: eu só escolho o cartão
  const isHolderView = (t: Transaction) => t.owner !== me

  function close(o: boolean) { if (!o) setSelectedId(null); onOpenChange(o) }

  // fechou o registro (confirmou, descartou ou cancelou): volta para a lista se ainda houver outros
  function closeForm(o: boolean) {
    if (o) return
    const others = pending.filter(t => t.id !== selected?.id).length
    if (others === 0) close(false)
    else setSelectedId(null)
  }

  function subtitle(t: Transaction) {
    const when = formatDate(t.date).slice(0, 5)
    if (isHolderView(t)) return `De ${nameOf(t.owner)} · qual cartão? · ${when}`
    if (t.holderId) return `${t.holderId === me ? 'Meu cartão' : `Cartão de ${nameOf(t.holderId)}`} · falta o cartão · ${when}`
    // Pix de alguém da família: receita para confirmar
    const from = senderOf(t.sourceData)?.name
    if (t.type === 'income' && from) return `Pix de ${from} · ${when}`
    return `${SOURCE_LABEL[t.source] ?? 'Automação'} · ${when}`
  }

  return (
    <>
      {del.sheet}
      {selected && isHolderView(selected) ? (
        <ChooseCardSheet key={selected.id} transaction={selected} buyer={nameOf(selected.owner)} open={open} onOpenChange={closeForm} />
      ) : selected ? (
        <QuickAddSheet key={selected.id} open={open} onOpenChange={closeForm} pending={selected} />
      ) : (
        <ModalSheet open={open} onOpenChange={close} title="Para confirmar">
          <ListGroup>
            {pending.map(t => (
              <ListRow key={t.id} chevron onClick={() => setSelectedId(t.id)}
                onDelete={isHolderView(t) ? undefined
                  : () => del.ask({ title: t.type === 'income' ? 'Descartar receita?' : 'Descartar gasto?', label: 'Descartar', remove: () => transactionsApi.remove(t.id) })}
                title={t.place || t.description || 'Sem local'}
                subtitle={subtitle(t)}
                trailing={<span className="text-body font-semibold tabular-nums text-foreground">{formatCurrency(t.amount)}</span>} />
            ))}
          </ListGroup>
        </ModalSheet>
      )}
    </>
  )
}
