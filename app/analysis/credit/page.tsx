'use client'

import { useState } from 'react'
import { FormRow } from '@/components/ios/form-row'
import { LargeTitleHeader } from '@/components/ios/large-title-header'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { ChoiceChip } from '@/components/shared/choice-chip'
import { CurrencyInput } from '@/components/shared/currency-input'
import { DecimalField } from '@/components/shared/decimal-field'
import { NumberField } from '@/components/shared/number-field'
import { SelectField } from '@/components/shared/select-field'
import { useInstitutionRates, useInstitutions } from '@/hooks/use-data'
import { BY_DAYS, PRODUCT_LABEL, priceLoan, revolvingDebt } from '@/lib/finance'
import type { CreditProduct } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { Money } from '@/components/shared/money'

const PRODUCTS = Object.keys(PRODUCT_LABEL) as CreditProduct[]

// Simulador de crédito por banco: taxa média do Banco Central (editável) e as fórmulas de cada produto.
export default function CreditSimulatorPage() {
  const institutions = useInstitutions()
  const rates = useInstitutionRates()
  const [institutionId, setInstitutionId] = useState('')
  const [product, setProduct] = useState<CreditProduct>('personal_loan')
  const [amount, setAmount] = useState(100000)
  const [term, setTerm] = useState(12)
  const [customRate, setCustomRate] = useState<number | null>(null)

  const bankId = institutionId || institutions[0]?.id || ''
  const bcb = rates.find(r => r.institutionId === bankId && r.product === product)
  const rate = customRate ?? bcb?.monthlyRate ?? 0
  const byDays = BY_DAYS.includes(product)
  const result = rate > 0 && amount > 0 && term > 0
    ? (byDays ? revolvingDebt(amount, rate, term, product === 'card_revolving') : priceLoan(amount, rate, term))
    : null
  const source = customRate != null
    ? 'Taxa digitada por você.'
    : bcb ? `Média do banco no Banco Central, ${formatDate(bcb.periodStart).slice(0, 5)} a ${formatDate(bcb.periodEnd).slice(0, 5)}. A sua pode ser outra.`
    : 'Sem taxa publicada para este banco. Digite a do contrato.'

  return (
    <>
      <LargeTitleHeader title="Simular crédito" />
      <div className="space-y-7 px-4 pt-2">
        <ListGroup>
          <FormRow label="Banco" htmlFor="sim-bank">
            <SelectField id="sim-bank" value={bankId} onChange={v => { setInstitutionId(v); setCustomRate(null) }}
              options={institutions.map(i => ({ value: i.id, label: i.name }))} />
          </FormRow>
        </ListGroup>

        <ListGroup header="Produto">
          <li className="flex flex-wrap gap-2 p-3">
            {PRODUCTS.map(p => (
              <ChoiceChip key={p} size="sm" selected={product === p}
                onClick={() => { setProduct(p); setCustomRate(null); setTerm(BY_DAYS.includes(p) ? 30 : 12) }}>
                {PRODUCT_LABEL[p]}
              </ChoiceChip>
            ))}
          </li>
        </ListGroup>

        <ListGroup footer={source}>
          <FormRow label="Valor" htmlFor="sim-amount">
            <CurrencyInput id="sim-amount" variant="bare" value={amount} onChange={setAmount} className="text-right" />
          </FormRow>
          <FormRow label={byDays ? 'Dias' : 'Parcelas'} htmlFor="sim-term">
            <NumberField id="sim-term" min={1} max={byDays ? 365 : 420} value={term} onChange={setTerm} className="w-16 text-right" />
          </FormRow>
          <FormRow label="Juros (% ao mês)" htmlFor="sim-rate">
            <DecimalField id="sim-rate" decimals={2} value={rate} onChange={setCustomRate} className="w-20 text-right" />
          </FormRow>
        </ListGroup>

        {result && (
          <ListGroup header="Resultado" footer={byDays ? 'Juros compostos por dia + IOF.' : 'Tabela Price + IOF (0,38% + 0,0082% ao dia).'}>
            {result.installment != null && (
              <ListRow title={`${term}x de`} trailing={<Money cents={result.installment} />} />
            )}
            <ListRow title="Juros" trailing={<Money cents={result.interest} size="inherit" tone="inherit" />} />
            <ListRow title="IOF" trailing={<Money cents={result.iof} size="inherit" tone="inherit" />} />
            <ListRow title="Total pago" trailing={<Money cents={result.total} tone="danger" />} />
          </ListGroup>
        )}
      </div>
    </>
  )
}
