'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ListGroup } from '@/components/ios/list-group'
import { ModalSheet } from '@/components/ios/modal-sheet'
import { useRefresh } from '@/hooks/use-refresh'
import { transactionsApi } from '@/lib/api/transactions'
import type { Transaction } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { feedback } from '@/lib/feedback'
import { useConfirmDelete } from '@/components/ios/use-delete-action'
import { ButtonRow } from '@/components/ios/button-row'

// Pares de compras possivelmente repetidas: apagar a repetida ou marcar que não é.
export function DuplicatesSheet({ open, pairs, onOpenChange }: {
  open: boolean; pairs: [Transaction, Transaction][]; onOpenChange: (o: boolean) => void
}) {
  const refresh = useRefresh()
  const confirmDel = useConfirmDelete()
  const [busy, setBusy] = useState<string | null>(null)

  async function run(key: string, fn: () => Promise<unknown>, done: string) {
    setBusy(key)
    try { await fn(); await refresh(); feedback.done(done) }
    catch (err) { feedback.error(err instanceof Error ? err.message : 'Não foi possível concluir.') }
    finally { setBusy(null) }
  }

  function keepBoth(a: Transaction, b: Transaction) {
    const mark = (t: Transaction, other: string) => {
      const prev = Array.isArray(t.sourceData?.not_duplicate) ? (t.sourceData!.not_duplicate as string[]) : []
      return transactionsApi.update(t.id, { sourceData: { ...(t.sourceData ?? {}), not_duplicate: [...prev, other] } })
    }
    return Promise.all([mark(a, b.id), mark(b, a.id)])
  }

  return (
    <ModalSheet open={open} onOpenChange={onOpenChange} title="Possíveis repetidas">
      {confirmDel.sheet}
      {pairs.length === 0 && <p className="py-6 text-center text-subheadline text-muted-foreground">Nada repetido.</p>}
      {pairs.map(([a, b]) => {
        const key = `${a.id}-${b.id}`
        return (
          <ListGroup key={key} header={`${formatCurrency(a.amount)} · ${a.place ?? b.place ?? 'Sem local'}`}>
            {[a, b].map(t => (
              <li key={t.id} className="flex justify-between gap-3 px-4 py-2 text-subheadline">
                <span className="shrink-0">{formatDate(t.date)}</span>
                <span className="min-w-0 truncate text-muted-foreground">{t.place ?? 'Sem local'}</span>
              </li>
            ))}
            <li className="p-3">
              <ButtonRow>
                <Button variant="destructive" disabled={busy === key} onClick={() => confirmDel.ask({ title: 'Excluir compra repetida?', remove: () => transactionsApi.remove(b.id) })}>Excluir uma</Button>
                <Button variant="secondary" disabled={busy === key} onClick={() => run(key, () => keepBoth(a, b), 'Mantidas')}>Manter ambas</Button>
              </ButtonRow>
            </li>
          </ListGroup>
        )
      })}
    </ModalSheet>
  )
}
