'use client'

import { Switch } from '@/components/ui/switch'
import { FormRow } from '@/components/ios/form-row'
import { ListGroup } from '@/components/ios/list-group'
import { RecurrenceEnd, type EndMode } from '@/components/bills/recurrence-end'
import { addMonths, capitalize, monthLabel } from '@/lib/utils'

export interface RepeatValue {
  on: boolean
  mode: EndMode
  endMonth: string
  times: number
}

export const repeatDefault = (month: string): RepeatValue => ({ on: false, mode: 'never', endMonth: addMonths(month, 11), times: 12 })

// último mês da série (AAAA-MM) ou null quando não tem fim
export function repeatLastMonth(r: RepeatValue, start: string): string | null {
  if (!r.on) return null
  if (r.mode === 'month') return r.endMonth < start ? start : r.endMonth
  if (r.mode === 'times') return addMonths(start, Math.max(1, r.times) - 1)
  return null
}

// "Repetir todo mês" no registro rápido: receita vira receita fixa (Contas, "A receber"); gasto vira gasto fixo
// (no cartão de crédito, cobrado sozinho na fatura). "Pagar depois" (later): gasto único que entra em Contas.
// fixed: edição de uma série que já repete, só com o fim da recorrência.
export function RepeatGroup({ value, onChange, start, lastLabel, later, fixed }: {
  value: RepeatValue; onChange: (v: RepeatValue) => void; start: string; lastLabel: string
  later?: { on: boolean; onChange: (on: boolean) => void }
  fixed?: boolean
}) {
  const last = repeatLastMonth(value, start)
  const set = (patch: Partial<RepeatValue>) => onChange({ ...value, ...patch })
  const footer = last ? `${capitalize(lastLabel)} em ${monthLabel(last)}.`
    : later?.on && !value.on ? 'Entra em Contas para pagar no vencimento.' : undefined
  return (
    <ListGroup footer={footer}>
      {!fixed && (
        <FormRow label="Repetir todo mês">
          <Switch checked={value.on} onCheckedChange={on => set({ on })} />
        </FormRow>
      )}
      {later && !value.on && (
        <FormRow label="Pagar depois">
          <Switch checked={later.on} onCheckedChange={later.onChange} />
        </FormRow>
      )}
      {value.on && (
        <RecurrenceEnd mode={value.mode} onModeChange={mode => set({ mode })} endMonth={value.endMonth}
          onEndMonthChange={endMonth => set({ endMonth })} minMonth={start} times={value.times} onTimesChange={times => set({ times })} />
      )}
    </ListGroup>
  )
}
