'use client'

import { useState } from 'react'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { ModalSheet } from '@/components/ios/modal-sheet'
import type { Transaction } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { PendingConfirm } from './pending-confirm'
import { transactionsApi } from '@/lib/api/transactions'
import { useConfirmDelete } from '@/components/ios/use-delete-action'

const SOURCE_LABEL: Record<string, string> = { apple_pay: 'Apple Pay', back_tap: 'Toque duplo', notification: 'SMS do banco' }

// Fila de pendentes: lista o que chegou pelas automações; tocar abre a confirmação.
export function PendingSheet({ open, pending, onOpenChange }: {
  open: boolean; pending: Transaction[]; onOpenChange: (o: boolean) => void
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const del = useConfirmDelete()
  const selected = pending.find(t => t.id === selectedId) ?? (pending.length === 1 ? pending[0] : null)

  function close(o: boolean) { if (!o) setSelectedId(null); onOpenChange(o) }

  return (
    <>
    {del.sheet}
    <ModalSheet open={open} onOpenChange={close} title={selected ? 'Confirmar gasto' : 'Para confirmar'}>
      {selected ? (
        <PendingConfirm key={selected.id} t={selected}
          onDone={() => { setSelectedId(null); if (pending.length <= 1) close(false) }} />
      ) : (
        <ListGroup>
          {pending.map(t => (
            <ListRow key={t.id} chevron onClick={() => setSelectedId(t.id)}
              onDelete={() => del.ask({ title: 'Descartar este gasto?', label: 'Descartar', remove: () => transactionsApi.remove(t.id) })}
              title={t.place || 'Sem local'}
              subtitle={`${SOURCE_LABEL[t.source] ?? 'Automação'} · ${formatDate(t.date).slice(0, 5)}`}
              trailing={<span className="text-body font-semibold tabular-nums text-foreground">{formatCurrency(t.amount)}</span>} />
          ))}
        </ListGroup>
      )}
    </ModalSheet>
    </>
  )
}
