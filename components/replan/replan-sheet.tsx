'use client'

import { useMemo, useState } from 'react'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { ModalSheet } from '@/components/ios/modal-sheet'
import { SegmentedControl } from '@/components/ios/segmented-control'
import { FormRow } from '@/components/ios/form-row'
import { CurrencyInput } from '@/components/shared/currency-input'
import { CategoryIcon } from '@/components/shared/category-icon'
import { useRefresh } from '@/hooks/use-refresh'
import { useReplanData } from '@/hooks/use-replan-data'
import { analysisApi } from '@/lib/api/analysis'
import { profileApi } from '@/lib/api/profile'
import { balanceMessage, proposedGoal, type Rhythm } from '@/lib/replan'
import { formatCurrency, monthName } from '@/lib/utils'
import { StepDots } from '@/components/ios/step-dots'
import { LoadingBlock } from '@/components/shared/loading-dots'
import { feedback } from '@/lib/feedback'

const STEPS = ['Como você gasta hoje', 'Afine cada categoria', 'Tudo pronto']
const ACTIONS = ['Continuar', 'Revisar', 'Salvar']

// 5.11: Replanejar metas em 3 etapas.
export function ReplanSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [step, setStep] = useState(0)
  return (
    <ModalSheet open={open} onOpenChange={o => { onOpenChange(o); if (!o) setStep(0) }}
      title="Replanejar metas" formId="replan" actionLabel={ACTIONS[step]}>
      {open && <Flow step={step} setStep={setStep} onDone={() => { onOpenChange(false); setStep(0) }} />}
    </ModalSheet>
  )
}

function Flow({ step, setStep, onDone }: { step: number; setStep: (n: number) => void; onDone: () => void }) {
  const { month, profile: p, income, budget, userId, profileId, loading } = useReplanData()
  const refresh = useRefresh()
  const [rhythm, setRhythm] = useState<Rhythm>('balance')
  const [overrides, setOverrides] = useState<Record<string, number>>({})
  const [editing, setEditing] = useState<string | null>(null)
  const [incomeDraft, setIncomeDraft] = useState<number>(income ?? 0)
  const [askIncome, setAskIncome] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const goals = useMemo(() => p.rows.map(r => ({
    row: r,
    value: overrides[r.category.id] ?? proposedGoal(r, rhythm),
  })), [p.rows, overrides, rhythm])

  const totalGoals = goals.reduce((s, g) => s + (g.value ?? 0), 0)
  const recent = goals.filter(g => g.row.average > 0)
  const idle = goals.filter(g => g.row.average === 0)
  const changes = goals.filter(g => (g.value ?? null) !== g.row.currentGoal)
  const pctOf = (v: number, base: number | null) => (base ? `${Math.round((v / base) * 100)}%` : null)
  const essentialPct = p.averageTotal ? Math.round((p.essential / p.averageTotal) * 100) : 0
  const leftover = income != null ? income - totalGoals : null

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (step < 2) { setStep(step + 1); return }
    try {
      await Promise.all(changes.map(g => analysisApi.setGoal(userId!, g.row.category.id, month, g.value && g.value > 0 ? g.value : null)))
      await refresh(); onDone(); feedback.done('Metas salvas')
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível salvar.') }
  }

  async function saveIncome() {
    if (!profileId) return
    await profileApi.update(profileId, { monthly_income: incomeDraft > 0 ? incomeDraft : null })
    setAskIncome(false)
    await refresh()
    feedback.done('Salvo')
  }

  if (loading) return <LoadingBlock />

  return (
    <form id="replan" onSubmit={submit} className="space-y-6">
      <StepDots step={step} total={3} />
      <h2 className="text-center text-title3 font-semibold">{STEPS[step]}</h2>

      {step === 0 && (
        <>
          <section className="space-y-3 rounded-3xl bg-grouped p-4">
            <div className="flex items-baseline justify-between">
              <p className="text-subheadline text-muted-foreground">Gasto médio por mês</p>
              <span className="rounded-full bg-fill px-2 py-0.5 text-caption1">Base: {p.baseLabel}</span>
            </div>
            <p className="text-title1 font-bold tabular-nums">{formatCurrency(p.averageTotal)}</p>
            {p.averageTotal > 0 ? (
              <>
                <div className="flex h-3 overflow-hidden rounded-full bg-fill">
                  <div className="bg-tint" style={{ width: `${essentialPct}%` }} />
                </div>
                <div className="flex justify-between text-footnote">
                  <span>Essencial {essentialPct}% · {formatCurrency(p.essential)}</span>
                  <span className="text-muted-foreground">Desejo {100 - essentialPct}% · {formatCurrency(p.desire)}</span>
                </div>
                <p className="text-body">{balanceMessage(p)}</p>
              </>
            ) : (
              <p className="text-body text-muted-foreground">Nenhum gasto ainda.</p>
            )}
          </section>

          <ListGroup footer="Opcional.">
            {askIncome || income != null ? (
              <FormRow label="Renda mensal" htmlFor="income">
                <CurrencyInput id="income" variant="bare" value={incomeDraft} onChange={setIncomeDraft} className="text-right" />
              </FormRow>
            ) : (
              <ListRow tone="tint" title="Informe sua renda para ver quanto sobra." onClick={() => setAskIncome(true)} />
            )}
            {(askIncome || (income != null && incomeDraft !== income)) && (
              <ListRow tone="tint" title="Salvar renda" onClick={saveIncome} />
            )}
          </ListGroup>
        </>
      )}

      {step === 1 && (
        <>
          <SegmentedControl<Rhythm> aria-label="Ritmo" value={rhythm} onChange={r => { setRhythm(r); setOverrides({}) }}
            options={[{ value: 'save', label: 'Economizar' }, { value: 'balance', label: 'Equilíbrio' }, { value: 'loose', label: 'Com folga' }]} />
          <p className="px-4 text-center text-footnote text-muted-foreground">
            {rhythm === 'save' ? 'Metas 10% abaixo do que você gasta.' : rhythm === 'loose' ? 'Metas 15% acima do que você gasta.' : 'Metas no ritmo do que você já gasta.'}
          </p>
          {[{ title: 'Com gasto recente', list: recent }, { title: 'Sem gasto recente', list: idle }].filter(g => g.list.length).map(group => (
            <ListGroup key={group.title} header={group.title}>
              {group.list.map(g => (
                editing === g.row.category.id ? (
                  <FormRow key={g.row.category.id} label={g.row.category.name} htmlFor={`goal-${g.row.category.id}`}>
                    <CurrencyInput id={`goal-${g.row.category.id}`} variant="bare" autoFocus value={g.value ?? 0}
                      onChange={v => setOverrides(o => ({ ...o, [g.row.category.id]: v }))} className="text-right" />
                  </FormRow>
                ) : (
                  <ListRow key={g.row.category.id} onClick={() => setEditing(g.row.category.id)}
                    leading={<CategoryIcon icon={g.row.category.icon} />}
                    title={g.row.category.name}
                    subtitle={g.row.average ? `hoje ${formatCurrency(g.row.average)}` : g.row.currentGoal ? 'mantém a meta atual' : 'sem meta'}
                    trailing={<span className="text-body font-semibold tabular-nums text-foreground">{g.value ? formatCurrency(g.value) : 'Sem meta'}</span>} />
                )
              ))}
            </ListGroup>
          ))}
          <dl className="grid grid-cols-3 gap-2 rounded-3xl bg-grouped p-4">
            <div><dt className="text-footnote text-muted-foreground">Em metas</dt><dd className="text-headline tabular-nums">{formatCurrency(totalGoals)}</dd></div>
            <div><dt className="text-footnote text-muted-foreground">Hoje</dt><dd className="text-headline tabular-nums">{formatCurrency(p.rows.reduce((s, r) => s + r.average, 0))}</dd></div>
            <div><dt className="text-footnote text-muted-foreground">Da renda</dt><dd className="text-headline tabular-nums">{pctOf(totalGoals, income) ?? '—'}</dd></div>
          </dl>
        </>
      )}

      {step === 2 && (
        <>
          <section className="space-y-2 rounded-3xl bg-grouped p-4 text-center">
            <p className="text-subheadline text-muted-foreground">Total em metas</p>
            <p className="text-large-title font-bold tabular-nums">{formatCurrency(totalGoals)}</p>
            <p className="text-body">
              {budget == null
                ? `Você ainda não definiu o orçamento de ${monthName(month)}.`
                : totalGoals <= budget
                  ? `Cabe no orçamento de ${monthName(month)} (${formatCurrency(budget)}), com ${formatCurrency(budget - totalGoals)} livres.`
                  : `Passa ${formatCurrency(totalGoals - budget)} do orçamento de ${monthName(month)} (${formatCurrency(budget)}).`}
            </p>
            <p className="text-subheadline text-muted-foreground">
              {leftover == null
                ? 'Informe sua renda na primeira etapa para ver quanto você guarda por mês.'
                : leftover >= 0
                  ? `Você guarda ${formatCurrency(leftover)} por mês (${pctOf(leftover, income)} da renda).`
                  : `As metas passam ${formatCurrency(-leftover)} da sua renda.`}
            </p>
          </section>
          <ListGroup header={`O que muda · ${changes.length}`}>
            {changes.length === 0 && <li className="p-4 text-center text-subheadline text-muted-foreground">Nenhuma meta muda.</li>}
            {changes.map(g => (
              <ListRow key={g.row.category.id}
                leading={<CategoryIcon icon={g.row.category.icon} />}
                title={g.row.category.name}
                trailing={
                  <span className="text-subheadline tabular-nums">
                    <span className="text-muted-foreground">{g.row.currentGoal ? formatCurrency(g.row.currentGoal) : 'sem meta'}</span>
                    {' → '}
                    <span className="font-semibold text-foreground">{g.value ? formatCurrency(g.value) : 'sem meta'}</span>
                  </span>
                } />
            ))}
          </ListGroup>
        </>
      )}

      {error && <p className="px-4 text-footnote text-destructive">{error}</p>}
      {step > 0 && (
        <button type="button" onClick={() => setStep(step - 1)} className="mx-auto block text-body text-tint">Voltar</button>
      )}
    </form>
  )
}
