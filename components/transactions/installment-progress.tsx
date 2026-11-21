'use client'

import { FormRow } from '@/components/ios/form-row'
import { SegmentedControl } from '@/components/ios/segmented-control'
import { NumberField } from '@/components/shared/number-field'
import { addMonths, formatCurrency, monthName } from '@/lib/utils'

interface InstallmentProgressProps {
  installments: number
  current: number
  onCurrentChange: (n: number) => void
  amountIsInstallment: boolean
  onAmountIsInstallmentChange: (v: boolean) => void
  purchaseDate: string
  // valor digitado (total ou da parcela), para a prévia "2x de R$ …"
  amount: number
}

// Compra parcelada já em andamento: em que parcela está e se o valor digitado é o total ou o da parcela.
// Só entram da parcela atual em diante; as anteriores já foram pagas.
export function InstallmentProgress({
  installments, current, onCurrentChange, amountIsInstallment, onAmountIsInstallmentChange, purchaseDate, amount,
}: InstallmentProgressProps) {
  const last = addMonths(purchaseDate.slice(0, 7), installments - 1)
  const each = amountIsInstallment ? amount : Math.round(amount / installments)
  const preview = amount > 0 ? `${installments}x de ${formatCurrency(each)}${amountIsInstallment ? ` (total ${formatCurrency(amount * installments)})` : ''} · ` : ''
  return (
    <>
      <FormRow label="Parcela atual" htmlFor="current-installment">
        <NumberField id="current-installment" min={1} max={installments} value={current} onChange={onCurrentChange} className="w-16 text-right" />
      </FormRow>
      <li className="space-y-2 p-3">
        <SegmentedControl aria-label="O valor digitado é" value={amountIsInstallment ? 'one' : 'total'}
          onChange={v => onAmountIsInstallmentChange(v === 'one')}
          options={[{ value: 'total', label: 'Valor total' }, { value: 'one', label: 'Valor da parcela' }]} />
        <p className="px-1 text-footnote text-muted-foreground">
          {preview}Última parcela em {monthName(last, 'short')} {last.slice(0, 4)}
        </p>
      </li>
    </>
  )
}
