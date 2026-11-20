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

// "Repetir todo mês" no registro rápido: receita vira receita fixa (Contas, "A receber"); gasto vira conta fixa
// (no cartão de crédito, cobrada sozinha na fatura).
export function RepeatGroup({ value, onChange, start, lastLabel }: {
  value: RepeatValue; onChange: (v: RepeatValue) => void; start: string; lastLabel: string
}) {
  const last = repeatLastMonth(value, start)
  const set = (patch: Partial<RepeatValue>) => onChange({ ...value, ...patch })
  return (
    <ListGroup footer={last ? `${capitalize(lastLabel)} em ${monthLabel(last)}.` : undefined}>
      <FormRow label="Repetir todo mês">
        <Switch checked={value.on} onCheckedChange={on => set({ on })} />
      </FormRow>
      {value.on && (
        <RecurrenceEnd mode={value.mode} onModeChange={mode => set({ mode })} endMonth={value.endMonth}
          onEndMonthChange={endMonth => set({ endMonth })} minMonth={start} times={value.times} onTimesChange={times => set({ times })} />
      )}
    </ListGroup>
  )
}
