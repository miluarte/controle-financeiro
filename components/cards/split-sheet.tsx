'use client'

import { useState } from 'react'
import { FormRow } from '@/components/ios/form-row'
import { ListGroup } from '@/components/ios/list-group'
import { ModalSheet } from '@/components/ios/modal-sheet'
import { SegmentedControl } from '@/components/ios/segmented-control'
import { MemberAvatar } from '@/components/family/member-avatar'
import { ChoiceChip } from '@/components/shared/choice-chip'
import { CurrencyInput } from '@/components/shared/currency-input'
import { NumberField } from '@/components/shared/number-field'
import { useRefresh } from '@/hooks/use-refresh'
import { familyApi } from '@/lib/api/family'
import type { FamilyMember, Transaction } from '@/lib/types'
import { equalParts } from '@/lib/split'
import { formatCurrency } from '@/lib/utils'
import { feedback } from '@/lib/feedback'
import { Money } from '@/components/shared/money'
import { FormError } from '@/components/shared/form-error'
import { Note } from '@/components/shared/note'

type Mode = 'equal' | 'value' | 'percent'


// ATR-5: dividir uma compra à vista entre duas ou mais pessoas, por valor ou percentual.
export function SplitSheet({
  transaction, people, me, onClose,
}: { transaction: Transaction | null; people: FamilyMember[]; me?: string; onClose: () => void }) {
  return (
    <ModalSheet open={!!transaction} onOpenChange={o => { if (!o) onClose() }} title="Dividir compra" formId="split" actionLabel="Dividir">
      {transaction && <Form key={transaction.id} t={transaction} people={people} me={me} onDone={onClose} />}
    </ModalSheet>
  )
}

function Form({ t, people, me, onDone }: { t: Transaction; people: FamilyMember[]; me?: string; onDone: () => void }) {
  const refresh = useRefresh()
  const [selected, setSelected] = useState<string[]>(people.slice(0, 2).map(p => p.userId))
  const [mode, setMode] = useState<Mode>('equal')
  const [values, setValues] = useState<Record<string, number>>({})
  const [percents, setPercents] = useState<Record<string, number>>({})
  const [error, setError] = useState<string | null>(null)

  const chosen = people.filter(p => selected.includes(p.userId))
  const equal = equalParts(t.amount, Math.max(chosen.length, 1))

  // Percentual: arredonda em centavos e joga a diferença na primeira pessoa.
  const fromPercent = () => {
    const raw = chosen.map(p => Math.round((t.amount * (percents[p.userId] ?? 0)) / 100))
    if (raw.length) raw[0] += t.amount - raw.reduce((s, v) => s + v, 0)
    return raw
  }
  const amounts = mode === 'equal' ? equal : mode === 'value' ? chosen.map(p => values[p.userId] ?? 0) : fromPercent()
  const sum = mode === 'percent'
    ? chosen.reduce((s, p) => s + (percents[p.userId] ?? 0), 0)
    : amounts.reduce((s, v) => s + v, 0)
  const valid = chosen.length >= 2 && (mode === 'percent' ? sum === 100 : sum === t.amount) && amounts.every(v => v > 0)

  function toggle(id: string) {
    setSelected(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) { setError(mode === 'percent' ? 'Os percentuais precisam somar 100%.' : `As partes precisam somar ${formatCurrency(t.amount)}.`); return }
    try {
      await familyApi.splitPurchase(t.id, chosen.map((p, i) => ({ userId: p.userId, amount: amounts[i] })))
      await refresh(); onDone(); feedback.done('Compra dividida')
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível dividir.') }
  }

  const label = (p: FamilyMember) => (p.userId === me ? 'Você' : p.name)

  return (
    <form id="split" onSubmit={save} className="space-y-6">
      <Note size="subheadline">
        {t.place || t.description || 'Compra'} · {formatCurrency(t.amount)}
      </Note>

      <ListGroup header="Entre quem">
        <li className="flex flex-wrap gap-2 p-3">
          {people.map(p => (
            <ChoiceChip key={p.userId} selected={selected.includes(p.userId)} onClick={() => toggle(p.userId)} className="pl-1">
              <MemberAvatar name={p.name} color={p.avatarColor} size="sm" />{label(p)}
            </ChoiceChip>
          ))}
        </li>
      </ListGroup>

      <SegmentedControl<Mode> aria-label="Como dividir" value={mode} onChange={setMode}
        options={[{ value: 'equal', label: 'Igual' }, { value: 'value', label: 'Por valor' }, { value: 'percent', label: 'Por %' }]} />

      <ListGroup footer={mode === 'percent' ? `Total: ${sum}%` : `Total: ${formatCurrency(sum)} de ${formatCurrency(t.amount)}`}>
        {chosen.map((p, i) => (
          <FormRow key={p.userId} label={label(p)} htmlFor={`split-${p.userId}`}>
            {mode === 'equal' ? (
              <Money cents={amounts[i]} size="rowRegular" tone="muted" />
            ) : mode === 'value' ? (
              <CurrencyInput id={`split-${p.userId}`} variant="bare" value={values[p.userId] ?? 0}
                onChange={v => setValues(s => ({ ...s, [p.userId]: v }))} className="text-right" />
            ) : (
              <span className="flex items-center gap-1">
                <NumberField id={`split-${p.userId}`} min={0} max={100} value={percents[p.userId] ?? 0}
                  onChange={v => setPercents(s => ({ ...s, [p.userId]: v }))} className="w-12 text-right" />
                <span className="text-body text-muted-foreground">%</span>
              </span>
            )}
          </FormRow>
        ))}
      </ListGroup>

      <FormError message={error} />
    </form>
  )
}
