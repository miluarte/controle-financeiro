'use client'

import { useState } from 'react'
import { useRefresh } from '@/hooks/use-refresh'
import { feedback } from '@/lib/feedback'

// Arquivar/Reativar como ação secundária da folha (ModalSheet secondaryAction), ao lado do Salvar.
export function useArchiveAction(onDone: () => void) {
  const refresh = useRefresh()
  const [busy, setBusy] = useState(false)
  function action(active: boolean, toggle: () => Promise<unknown>) {
    return {
      label: active ? 'Arquivar' : 'Reativar',
      disabled: busy,
      onClick: async () => {
        setBusy(true)
        try { await toggle(); await refresh(); onDone(); feedback.done(active ? 'Arquivado' : 'Reativado') }
        catch (err) { feedback.error(err instanceof Error ? err.message : 'Não foi possível concluir.') }
        finally { setBusy(false) }
      },
    }
  }
  return { action }
}
