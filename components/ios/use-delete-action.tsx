'use client'

import { useState } from 'react'
import { useRefresh } from '@/hooks/use-refresh'
import { feedback } from '@/lib/feedback'
import { ActionSheet } from './action-sheet'

// aviso depois da ação, pelo verbo do botão (Excluir → Excluído)
const DONE: Record<string, string> = {
  Excluir: 'Excluído', Encerrar: 'Encerrado', Descartar: 'Descartado', Arquivar: 'Arquivado',
  'Cancelar acerto': 'Acerto cancelado', Remover: 'Removido', Sair: 'Saiu', Recusar: 'Recusado',
}
export const doneText = (label: string, done?: string) => done ?? DONE[label] ?? 'Pronto'

// Excluir com confirmação numa folha de ações. Devolve a função que abre a pergunta e a folha.
export function useDeleteAction({ title, label = 'Excluir', done, remove, onDone }: {
  title: string; label?: string; done?: string; remove: () => Promise<unknown>; onDone: () => void
}) {
  const refresh = useRefresh()
  const [open, setOpen] = useState(false)
  const sheet = (
    <ActionSheet open={open} onOpenChange={setOpen} title={title}
      actions={[{
        label, destructive: true,
        onSelect: async () => {
          try { await remove(); await refresh(); onDone(); feedback.done(doneText(label, done)) }
          catch (err) { feedback.error(err instanceof Error ? err.message : 'Não foi possível excluir.') }
        },
      }]} />
  )
  return { ask: () => setOpen(true), sheet }
}

// Mesma confirmação, para listas: cada linha pede a exclusão do próprio item (ex.: deslizar para excluir).
export function useConfirmDelete() {
  const refresh = useRefresh()
  const [req, setReq] = useState<{ title: string; label?: string; done?: string; remove: () => Promise<unknown> } | null>(null)
  const sheet = (
    <ActionSheet open={!!req} onOpenChange={o => { if (!o) setReq(null) }} title={req?.title ?? ''}
      actions={req ? [{
        label: req.label ?? 'Excluir', destructive: true,
        onSelect: async () => {
          try { await req.remove(); await refresh(); feedback.done(doneText(req.label ?? 'Excluir', req.done)) }
          catch (err) { feedback.error(err instanceof Error ? err.message : 'Não foi possível excluir.') }
        },
      }] : []} />
  )
  return { ask: setReq, sheet }
}
