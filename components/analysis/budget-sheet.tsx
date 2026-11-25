'use client'

import { useState } from 'react'
import { ModalSheet } from '@/components/ios/modal-sheet'
import { CurrencyInput } from '@/components/shared/currency-input'
import { useRefresh } from '@/hooks/use-refresh'
import { useSession } from '@/hooks/use-session'
import { analysisApi } from '@/lib/api/analysis'
import { monthName } from '@/lib/utils'
import { feedback } from '@/lib/feedback'
import { FormError } from '@/components/shared/form-error'
import { Note } from '@/components/shared/note'

// Define o orçamento total do mês (teto independente das metas por categoria).
export function BudgetSheet({
  open, onOpenChange, month, current,
}: { open: boolean; onOpenChange: (o: boolean) => void; month: string; current: number | null }) {
  return (
    <ModalSheet open={open} onOpenChange={onOpenChange} title="Orçamento" formId="budget" actionLabel="Salvar">
      {open && <Form month={month} current={current} onDone={() => onOpenChange(false)} />}
    </ModalSheet>
  )
}

function Form({ month, current, onDone }: { month: string; current: number | null; onDone: () => void }) {
  const { session } = useSession()
  const refresh = useRefresh()
  const [value, setValue] = useState(current ?? 0)
  const [error, setError] = useState<string | null>(null)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    try {
      await analysisApi.setBudget(session!.user.id, month, value)
      await refresh(); onDone(); feedback.done('Orçamento salvo')
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível salvar.') }
  }

  return (
    <form id="budget" onSubmit={save} className="space-y-4">
      <CurrencyInput id="budget-value" aria-label="Orçamento" variant="display" value={value} onChange={setValue} />
      <Note>
        Total para gastar em {monthName(month)}.
      </Note>
      <FormError message={error} />
    </form>
  )
}
