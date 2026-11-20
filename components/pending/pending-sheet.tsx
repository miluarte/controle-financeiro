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

const SOURCE_LABEL: Record<string, string> = { apple_pay: 'Apple Pay', back_tap: 'Toque duplo', notification: 'SMS do banco' }

// Fila de pendentes: lista o que chegou pelas automações; tocar abre o registro de gasto já preenchido.
// Com um só pendente, abre direto o registro.
export function PendingSheet({ open, pending, onOpenChange }: {
  open: boolean; pending: Transaction[]; onOpenChange: (o: boolean) => void
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const del = useConfirmDelete()
  const selected = pending.find(t => t.id === selectedId) ?? (pending.length === 1 ? pending[0] : null)

  function close(o: boolean) { if (!o) setSelectedId(null); onOpenChange(o) }

  // fechou o registro (confirmou, descartou ou cancelou): volta para a lista se ainda houver outros
  function closeForm(o: boolean) {
    if (o) return
    const others = pending.filter(t => t.id !== selected?.id).length
    if (others === 0) close(false)
    else setSelectedId(null)
  }

  return (
    <>
      {del.sheet}
      {selected ? (
        <QuickAddSheet key={selected.id} open={open} onOpenChange={closeForm} pending={selected} />
      ) : (
        <ModalSheet open={open} onOpenChange={close} title="Para confirmar">
          <ListGroup>
            {pending.map(t => (
              <ListRow key={t.id} chevron onClick={() => setSelectedId(t.id)}
                onDelete={() => del.ask({ title: 'Descartar este gasto?', label: 'Descartar', remove: () => transactionsApi.remove(t.id) })}
                title={t.place || 'Sem local'}
                subtitle={`${SOURCE_LABEL[t.source] ?? 'Automação'} · ${formatDate(t.date).slice(0, 5)}`}
                trailing={<span className="text-body font-semibold tabular-nums text-foreground">{formatCurrency(t.amount)}</span>} />
            ))}
          </ListGroup>
        </ModalSheet>
      )}
    </>
  )
}
