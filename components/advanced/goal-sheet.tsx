'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormRow } from '@/components/ios/form-row'
import { ListGroup } from '@/components/ios/list-group'
import { ModalSheet } from '@/components/ios/modal-sheet'
import { CurrencyInput } from '@/components/shared/currency-input'
import { NumberField } from '@/components/shared/number-field'
import { useRefresh } from '@/hooks/use-refresh'
import { goalsApi } from '@/lib/api/advanced'
import type { Goal } from '@/lib/types'

// Criar ou editar um objetivo (ex.: comprar uma moto).
export function GoalSheet({ open, goal, nextPriority, onOpenChange }: {
  open: boolean; goal: Goal | null; nextPriority: number; onOpenChange: (o: boolean) => void
}) {
  return (
    <ModalSheet open={open} onOpenChange={onOpenChange} title={goal ? 'Objetivo' : 'Novo objetivo'} formId="goal-form" actionLabel="Salvar">
      {open && <GoalForm key={goal?.id ?? 'new'} goal={goal} nextPriority={nextPriority} onDone={() => onOpenChange(false)} />}
    </ModalSheet>
  )
}

function GoalForm({ goal, nextPriority, onDone }: { goal: Goal | null; nextPriority: number; onDone: () => void }) {
  const refresh = useRefresh()
  const [name, setName] = useState(goal?.name ?? '')
  const [target, setTarget] = useState(goal?.targetAmount ?? 0)
  const [saved, setSaved] = useState(goal?.savedAmount ?? 0)
  const [date, setDate] = useState(goal?.targetDate?.slice(0, 7) ?? '')
  const [priority, setPriority] = useState(goal?.priority ?? nextPriority)
  const [error, setError] = useState<string | null>(null)

  async function run(fn: () => Promise<void>) {
    setError(null)
    try { await fn(); await refresh(); onDone() }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível salvar.') }
  }

  function save(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Dê um nome.'); return }
    if (target <= 0) { setError('Informe o valor.'); return }
    const input = { name: name.trim(), targetAmount: target, savedAmount: saved, targetDate: date ? `${date}-01` : null, priority }
    run(() => goal ? goalsApi.update(goal.id, input) : goalsApi.create(input))
  }

  return (
    <form id="goal-form" onSubmit={save} className="space-y-6">
      <CurrencyInput id="goal-target" aria-label="Valor do objetivo" variant="display" value={target} onChange={setTarget} />
      <ListGroup>
        <FormRow label="Nome" htmlFor="goal-name">
          <Input id="goal-name" variant="bare" value={name} onChange={e => setName(e.target.value)} placeholder="Moto, viagem…" className="text-right" />
        </FormRow>
        <FormRow label="Já guardado" htmlFor="goal-saved">
          <CurrencyInput id="goal-saved" variant="bare" value={saved} onChange={setSaved} className="text-right" />
        </FormRow>
        <FormRow label="Quero até" htmlFor="goal-date">
          <Input id="goal-date" type="month" variant="bare" value={date} onChange={e => setDate(e.target.value)} className="w-auto text-right" />
        </FormRow>
        <FormRow label="Prioridade" htmlFor="goal-priority">
          <NumberField id="goal-priority" min={1} max={99} value={priority} onChange={setPriority} className="w-16 text-right" />
        </FormRow>
      </ListGroup>
      <p className="px-4 text-footnote text-muted-foreground">Prioridade 1 recebe a poupança primeiro.</p>
      {error && <p className="px-4 text-footnote text-destructive">{error}</p>}
      {goal && (
        <Button type="button" variant="ghost" size="lg" className="w-full text-destructive"
          onClick={() => { if (confirm('Excluir este objetivo?')) run(() => goalsApi.remove(goal.id)) }}>
          Excluir objetivo
        </Button>
      )}
    </form>
  )
}
