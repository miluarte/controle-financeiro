'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { FormRow } from '@/components/ios/form-row'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { CurrencyInput } from '@/components/shared/currency-input'
import { transactionsApi } from '@/lib/api/transactions'
import type { Transaction } from '@/lib/types'
import { capitalize, cn, formatCurrency, monthName } from '@/lib/utils'

type Part = { user_id: string; amount: number }
type Month = { n: number | null; date: string; parts: Part[] }

// Compra dividida e parcelada aberta no formulário: o valor de cada pessoa nesta parcela (editável, ex.: corrigir
// um centavo) e a divisão mês a mês. Os valores alterados são gravados com adjust_split_part ao salvar.
export function useSplitParcel(t: Transaction | null) {
  const split = !!t && Array.isArray(t.sourceData?.split_parts)
  const root = t ? (typeof t.sourceData?.split_of === 'string' ? t.sourceData.split_of : t.id) : ''
  const { data: parts } = useSWR(split ? ['split-parts', root] : null, () => transactionsApi.splitParts(root))
  // só os valores alterados; os demais vêm do banco
  const [amounts, setAmounts] = useState<Record<string, number>>({})
  const changed = (parts ?? []).filter(p => amounts[p.id] && amounts[p.id] !== p.amount).map(p => ({ id: p.id, amount: amounts[p.id] }))

  // divisão mês a mês com o que foi alterado e ainda não salvo
  const delta: Record<string, number> = {}
  for (const p of parts ?? []) delta[p.owner] = (delta[p.owner] ?? 0) + (amounts[p.id] ?? p.amount) - p.amount
  const schedule = t && Array.isArray(t.sourceData?.split_schedule)
    ? (t.sourceData.split_schedule as Month[]).map(m => (m.n === t.installmentN
      ? { ...m, parts: m.parts.map(p => ({ ...p, amount: Number(p.amount) + (delta[p.user_id] ?? 0) })) } : m))
    : null

  async function save() {
    for (const c of changed) await transactionsApi.adjustSplitPart(c.id, c.amount)
  }

  return { active: split && (t?.installmentsTotal ?? 1) > 1, parts: parts ?? [], amounts, setAmounts, changed, schedule, save }
}

export function SplitParcelGroups({ t, state, nameOf, disabled }: {
  t: Transaction
  state: ReturnType<typeof useSplitParcel>
  nameOf: (id: string) => string
  disabled?: boolean
}) {
  const n = t.installmentsTotal ?? 1
  return (
    <>
      {state.parts.length > 0 && (
        <ListGroup header={`Parcela ${t.installmentN ?? 1} de ${n}`}>
          {state.parts.map(p => (
            <FormRow key={p.id} label={nameOf(p.owner)} htmlFor={`part-${p.id}`}>
              <CurrencyInput id={`part-${p.id}`} variant="bare" className="text-right" disabled={disabled}
                value={state.amounts[p.id] ?? p.amount} onChange={v => state.setAmounts(a => ({ ...a, [p.id]: v }))} />
            </FormRow>
          ))}
        </ListGroup>
      )}
      {state.schedule && state.schedule.length > 1 && (
        <ListGroup header="Por mês">
          {state.schedule.map(m => (
            <ListRow key={m.n ?? 0}
              title={<span className={cn(m.n === t.installmentN && 'font-semibold')}>{`${m.n} de ${n} · ${capitalize(monthName(m.date.slice(0, 7), 'short'))} ${m.date.slice(0, 4)}`}</span>}
              subtitle={m.parts.map(p => `${nameOf(p.user_id)} ${formatCurrency(Number(p.amount))}`).join(' · ')}
              trailing={<span className="text-body tabular-nums text-foreground">{formatCurrency(m.parts.reduce((sum, p) => sum + Number(p.amount), 0))}</span>} />
          ))}
        </ListGroup>
      )}
    </>
  )
}
