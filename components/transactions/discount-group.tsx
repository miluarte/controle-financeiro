'use client'

import { FormRow } from '@/components/ios/form-row'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { SegmentedControl } from '@/components/ios/segmented-control'
import { CurrencyInput } from '@/components/shared/currency-input'
import { DecimalField } from '@/components/shared/decimal-field'
import { Switch } from '@/components/ui/switch'
import { PickerRow } from '@/components/shared/picker-row'
import { discountAmount, discountError, discountLabel, discountShare, type Discount, type DiscountKind, type DiscountValue } from '@/lib/discount'
import { formatCurrency } from '@/lib/utils'
import { Money } from '@/components/shared/money'

// "Teve desconto?" no gasto: em porcentagem ou em reais, abatido do valor da compra.
// gross: total da compra sem desconto (na parcelada, todas as parcelas).
// people: na compra dividida, quem está na divisão, para escolher de quem é o desconto.
const ALL = 'all'

export function DiscountGroup({ value, onChange, gross, people = [], error: extraError }: {
  value: DiscountValue
  onChange: (v: DiscountValue) => void
  gross: number
  people?: { value: string; label: string }[]
  // erro que depende do resto do formulário (ex.: divisão)
  error?: string | null
}) {
  const set = (patch: Partial<DiscountValue>) => onChange({ ...value, ...patch })
  const amount = discountAmount(value, gross)
  const error = discountError(value, gross) ?? extraError ?? null
  const footer = !value.on || gross <= 0 ? undefined
    : error ?? (amount > 0 ? `Total com desconto: ${formatCurrency(gross - amount)}.` : undefined)
  return (
    <ListGroup footer={footer}>
      <FormRow label="Teve desconto?">
        <Switch checked={value.on} onCheckedChange={on => set({ on })} />
      </FormRow>
      {value.on && (
        <>
          <FormRow label="Desconto em">
            <SegmentedControl<DiscountKind> aria-label="Desconto em" className="w-32" value={value.kind}
              onChange={kind => set({ kind })}
              options={[{ value: 'percent', label: '%' }, { value: 'value', label: 'R$' }]} />
          </FormRow>
          {value.kind === 'percent' ? (
            <FormRow label="Porcentagem" htmlFor="discount-percent">
              <span className="flex items-center gap-1 text-body">
                <DecimalField id="discount-percent" decimals={2} value={value.percent}
                  onChange={percent => set({ percent: Math.min(percent, 100) })} className="w-20 text-right" />
                <span className="text-muted-foreground">%</span>
              </span>
            </FormRow>
          ) : (
            <FormRow label="Valor" htmlFor="discount-value">
              <CurrencyInput id="discount-value" variant="bare" className="text-right" value={value.value}
                onChange={v => set({ value: v })} />
            </FormRow>
          )}
          {people.length > 1 && (
            <PickerRow id="discount-to" label="Desconto para" value={value.to && people.some(p => p.value === value.to) ? value.to : ALL}
              onChange={v => set({ to: v === ALL ? null : v })}
              options={[{ value: ALL, label: 'Todos' }, ...people]} />
          )}
        </>
      )}
    </ListGroup>
  )
}

// Desconto de um lançamento já registrado (só leitura): o desconto da compra inteira e, na compra
// dividida, a parte de cada pessoa (inteiro para a pessoa escolhida ou na proporção da divisão).
export function DiscountSummary({ discount, parts, nameOf, installments }: {
  discount: Discount
  parts?: { user_id: string; amount: number }[] | null
  nameOf?: (userId: string) => string
  installments?: number
}) {
  const sum = parts?.reduce((s, p) => s + Number(p.amount), 0) ?? 0
  const footer = `Sem desconto: ${formatCurrency(discount.gross)}${installments && installments > 1 ? ' na compra inteira' : ''}.`
  return (
    <ListGroup footer={footer}>
      <ListRow title="Desconto"
        trailing={<span className="text-body tabular-nums text-foreground">{discountLabel(discount, formatCurrency)}</span>} />
      {parts && nameOf && parts.length > 1 && parts.map(p => (
        <ListRow key={p.user_id} title={nameOf(p.user_id)}
          trailing={<Money cents={discountShare(discount, p.user_id, Number(p.amount), sum)} size="rowRegular" />} />
      ))}
    </ListGroup>
  )
}
