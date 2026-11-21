'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ModalSheet } from '@/components/ios/modal-sheet'
import { CurrencyInput } from '@/components/shared/currency-input'
import { useRefresh } from '@/hooks/use-refresh'
import { useSession } from '@/hooks/use-session'
import { analysisApi } from '@/lib/api/analysis'
import type { CategorySpending } from '@/lib/types'
import { formatCurrency, monthName } from '@/lib/utils'
import { feedback } from '@/lib/feedback'

// Meta mensal de uma categoria, vigente a partir do mês escolhido.
export function GoalSheet({
  row, month, onClose,
}: { row: CategorySpending | null; month: string; onClose: () => void }) {
  return (
    <ModalSheet open={!!row} onOpenChange={o => { if (!o) onClose() }} title={row?.name ?? ''} formId="goal" actionLabel="Salvar">
      {row && <Form key={row.categoryId} row={row} month={month} onDone={onClose} />}
    </ModalSheet>
  )
}

function Form({ row, month, onDone }: { row: CategorySpending; month: string; onDone: () => void }) {
  const { session } = useSession()
  const refresh = useRefresh()
  const [value, setValue] = useState(row.goal ?? 0)
  const [error, setError] = useState<string | null>(null)

  async function save(amount: number | null) {
    try {
      await analysisApi.setGoal(session!.user.id, row.categoryId, month, amount)
      await refresh(); onDone(); feedback.done(amount ? 'Meta salva' : 'Meta removida')
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível salvar.') }
  }

  return (
    <form id="goal" onSubmit={e => { e.preventDefault(); save(value) }} className="space-y-4">
      <CurrencyInput id="goal-value" aria-label="Meta mensal" variant="display" value={value} onChange={setValue} />
      <p className="px-4 text-center text-footnote text-muted-foreground">
        Meta mensal a partir de {monthName(month)}. Gasto neste mês: {formatCurrency(row.total)}.
      </p>
      {error && <p className="px-4 text-footnote text-destructive">{error}</p>}
      {row.goal != null && (
        <Button type="button" variant="ghost" size="lg" className="w-full text-destructive" onClick={() => save(null)}>
          Remover meta deste mês
        </Button>
      )}
    </form>
  )
}
