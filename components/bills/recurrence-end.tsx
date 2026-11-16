'use client'

import { FormRow } from '@/components/ios/form-row'
import { SegmentedControl } from '@/components/ios/segmented-control'
import { NumberField } from '@/components/shared/number-field'
import { DateField } from '@/components/shared/date-field'

export type EndMode = 'never' | 'month' | 'times'

interface RecurrenceEndProps {
  mode: EndMode
  onModeChange: (m: EndMode) => void
  endMonth: string
  onEndMonthChange: (m: string) => void
  minMonth: string
  times: number
  onTimesChange: (n: number) => void
}

// Quando a recorrência termina: nunca, num mês ou depois de N vezes.
export function RecurrenceEnd({ mode, onModeChange, endMonth, onEndMonthChange, minMonth, times, onTimesChange }: RecurrenceEndProps) {
  return (
    <>
      <li className="p-3">
        <SegmentedControl aria-label="Termina" value={mode} onChange={onModeChange}
          options={[{ value: 'never', label: 'Sem fim' }, { value: 'month', label: 'Até o mês' }, { value: 'times', label: 'Nº de vezes' }]} />
      </li>
      {mode === 'month' && (
        <FormRow label="Último mês" htmlFor="bill-end">
          <DateField id="bill-end" mode="month" min={minMonth} value={endMonth} onChange={v => onEndMonthChange(v || minMonth)} />
        </FormRow>
      )}
      {mode === 'times' && (
        <FormRow label="Quantas vezes" htmlFor="bill-times">
          <NumberField id="bill-times" min={1} max={360} value={times} onChange={onTimesChange} className="w-16 text-right" />
        </FormRow>
      )}
    </>
  )
}
