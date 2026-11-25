'use client'

import { FormRow } from '@/components/ios/form-row'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { SegmentedControl } from '@/components/ios/segmented-control'
import { CurrencyInput } from '@/components/shared/currency-input'
import { DecimalField } from '@/components/shared/decimal-field'
import { Switch } from '@/components/ui/switch'
import { discountAmount, discountError, discountLabel, type Discount, type DiscountKind, type DiscountValue } from '@/lib/discount'
import { formatCurrency } from '@/lib/utils'
import { Money } from '@/components/shared/money'

// "Teve desconto?" no gasto: em porcentagem ou em reais, abatido do valor da compra.
// gross: total da compra sem desconto (na parcelada, todas as parcelas).
export function DiscountGroup({ value, onChange, gross }: {
  value: DiscountValue
  onChange: (v: DiscountValue) => void
  gross: number
}) {
  const set = (patch: Partial<DiscountValue>) => onChange({ ...value, ...patch })
  const amount = discountAmount(value, gross)
  const error = discountError(value, gross)
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
        </>
      )}
    </ListGroup>
  )
}

// Desconto de um lançamento já registrado (só leitura): o desconto da compra inteira e, na compra
// dividida, a parte de cada pessoa, na mesma proporção da divisão.
export function DiscountSummary({ discount, parts, nameOf, installments }: {
  discount: Discount
  parts?: { user_id: string; amount: number }[] | null
  nameOf?: (userId: string) => string
  installments?: number
}) {
  const sum = parts?.reduce((s, p) => s + Number(p.amount), 0) ?? 0
  const share = (amount: number) => (sum > 0 ? Math.round((discount.amount * amount) / sum) : 0)
  const footer = `Sem desconto: ${formatCurrency(discount.gross)}${installments && installments > 1 ? ' na compra inteira' : ''}.`
  return (
    <ListGroup footer={footer}>
      <ListRow title="Desconto"
        trailing={<span className="text-body tabular-nums text-foreground">{discountLabel(discount, formatCurrency)}</span>} />
      {parts && nameOf && parts.length > 1 && parts.map(p => (
        <ListRow key={p.user_id} title={nameOf(p.user_id)}
          trailing={<Money cents={share(Number(p.amount))} size="rowRegular" />} />
      ))}
    </ListGroup>
  )
}
