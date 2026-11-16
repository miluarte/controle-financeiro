'use client'

import { MoneyBagLinearIcon } from '@solar-icons/react'
import { Input } from '@/components/ui/input'
import { FormRow } from '@/components/ios/form-row'
import { ListGroup } from '@/components/ios/list-group'
import { CurrencyInput } from '@/components/shared/currency-input'
import { NumberField } from '@/components/shared/number-field'
import { OnboardingStep, StepIcon } from './onboarding-step'

export interface IncomeDraft { name: string; amount: number; day: number }

// Receita fixa (salário): entra em Contas, em "A receber", todo mês.
export function IncomeStep({ value, onChange }: { value: IncomeDraft; onChange: (v: IncomeDraft) => void }) {
  return (
    <OnboardingStep icon={<StepIcon><MoneyBagLinearIcon /></StepIcon>} title="Quanto você recebe?"
      text="Salário ou outra renda que cai todo mês.">
      <CurrencyInput id="ob-income" aria-label="Valor" variant="display" value={value.amount} onChange={amount => onChange({ ...value, amount })} />
      <ListGroup>
        <FormRow label="Nome" htmlFor="ob-income-name">
          <Input id="ob-income-name" variant="bare" value={value.name} onChange={e => onChange({ ...value, name: e.target.value })} className="text-right" />
        </FormRow>
        <FormRow label="Dia de receber" htmlFor="ob-income-day">
          <NumberField id="ob-income-day" min={1} max={31} value={value.day} onChange={day => onChange({ ...value, day })} className="w-16 text-right" />
        </FormRow>
      </ListGroup>
    </OnboardingStep>
  )
}
