import type { SplitPart } from './split'

// Desconto na compra (valores em centavos). O valor digitado é o da compra sem desconto;
// o lançamento guarda o valor com o desconto abatido e o desconto em source_data.discount.
export type DiscountKind = 'percent' | 'value'

// estado do formulário
export interface DiscountValue { on: boolean; kind: DiscountKind; percent: number; value: number }

// guardado no lançamento: amount e gross valem para a compra inteira (todas as parcelas e pessoas)
export interface Discount { kind: DiscountKind; percent: number | null; amount: number; gross: number }

export const discountDefault = (): DiscountValue => ({ on: false, kind: 'percent', percent: 0, value: 0 })

// desconto em centavos sobre o total sem desconto
export function discountAmount(d: DiscountValue, gross: number) {
  if (!d.on || gross <= 0) return 0
  return d.kind === 'percent' ? Math.round((gross * Math.min(Math.max(d.percent, 0), 100)) / 100) : Math.max(d.value, 0)
}

export function discountError(d: DiscountValue, gross: number) {
  const amount = discountAmount(d, gross)
  return d.on && gross > 0 && amount >= gross ? 'O desconto passa do valor da compra.' : null
}

export function discountData(d: DiscountValue, gross: number): Discount | null {
  const amount = discountAmount(d, gross)
  if (!amount || amount >= gross) return null
  return { kind: d.kind, percent: d.kind === 'percent' ? d.percent : null, amount, gross }
}

export function discountOf(sourceData: Record<string, unknown> | null | undefined): Discount | null {
  const d = sourceData?.discount as Discount | undefined
  return d && typeof d.amount === 'number' && d.amount > 0 && typeof d.gross === 'number' ? d : null
}

// estado do formulário a partir do desconto guardado
export function discountValueOf(d: Discount | null): DiscountValue {
  if (!d) return discountDefault()
  return { on: true, kind: d.kind, percent: d.percent ?? 0, value: d.kind === 'value' ? d.amount : 0 }
}

// leva um valor sem desconto ao valor com desconto, na proporção (parcela, parte de cada pessoa)
export const withDiscount = (value: number, gross: number, net: number) =>
  gross > 0 && net !== gross ? Math.round((value * net) / gross) : value

// partes calculadas sobre o valor sem desconto, levadas ao valor com desconto; os centavos que
// sobram ficam com a primeira pessoa (quem divide), como no splitParts
export function discountParts(parts: SplitPart[], net: number): SplitPart[] {
  const sum = parts.reduce((s, p) => s + p.amount, 0)
  if (sum <= 0 || sum === net) return parts
  const out = parts.map(p => ({ ...p, amount: Math.floor((p.amount * net) / sum) }))
  if (out.length) out[0].amount += net - out.reduce((s, p) => s + p.amount, 0)
  return out
}

// rótulo do desconto: "10% · R$ 12,00" ou só o valor
export function discountLabel(d: Discount, format: (v: number) => string) {
  const pct = d.kind === 'percent' && d.percent ? `${d.percent.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}% · ` : ''
  return `${pct}${format(d.amount)}`
}
