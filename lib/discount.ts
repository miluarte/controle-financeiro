import type { SplitPart } from './split'

// Desconto na compra (valores em centavos). O valor digitado é o da compra sem desconto;
// o lançamento guarda o valor com o desconto abatido e o desconto em source_data.discount.
export type DiscountKind = 'percent' | 'value'

// estado do formulário; to: na compra dividida, a pessoa que fica com o desconto (null = todos, na proporção)
export interface DiscountValue { on: boolean; kind: DiscountKind; percent: number; value: number; to: string | null }

// guardado no lançamento: amount e gross valem para a compra inteira (todas as parcelas e pessoas);
// to: o desconto saiu inteiro da parte dessa pessoa
export interface Discount { kind: DiscountKind; percent: number | null; amount: number; gross: number; to?: string }

export const discountDefault = (): DiscountValue => ({ on: false, kind: 'percent', percent: 0, value: 0, to: null })

// desconto em centavos sobre o total sem desconto
export function discountAmount(d: DiscountValue, gross: number) {
  if (!d.on || gross <= 0) return 0
  return d.kind === 'percent' ? Math.round((gross * Math.min(Math.max(d.percent, 0), 100)) / 100) : Math.max(d.value, 0)
}

export function discountError(d: DiscountValue, gross: number) {
  const amount = discountAmount(d, gross)
  return d.on && gross > 0 && amount >= gross ? 'O desconto passa do valor da compra.' : null
}

// to: pessoa do desconto já conferida (está na divisão), senão null
export function discountData(d: DiscountValue, gross: number, to: string | null = null): Discount | null {
  const amount = discountAmount(d, gross)
  if (!amount || amount >= gross) return null
  return { kind: d.kind, percent: d.kind === 'percent' ? d.percent : null, amount, gross, ...(to ? { to } : {}) }
}

export function discountOf(sourceData: Record<string, unknown> | null | undefined): Discount | null {
  const d = sourceData?.discount as Discount | undefined
  return d && typeof d.amount === 'number' && d.amount > 0 && typeof d.gross === 'number' ? d : null
}

// estado do formulário a partir do desconto guardado
export function discountValueOf(d: Discount | null): DiscountValue {
  if (!d) return discountDefault()
  return { on: true, kind: d.kind, percent: d.percent ?? 0, value: d.kind === 'value' ? d.amount : 0, to: d.to ?? null }
}

// leva um valor sem desconto ao valor com desconto, na proporção (parcela, parte de cada pessoa)
export const withDiscount = (value: number, gross: number, net: number) =>
  gross > 0 && net !== gross ? Math.round((value * net) / gross) : value

// partes calculadas sobre o valor sem desconto, levadas ao valor com desconto; os centavos que
// sobram ficam com a primeira pessoa (quem divide), como no splitParts.
// to: o desconto sai inteiro da parte dessa pessoa (as outras não mudam); pode deixar a parte negativa,
// conferido por discountPartError
export function discountParts(parts: SplitPart[], net: number, to: string | null = null): SplitPart[] {
  const sum = parts.reduce((s, p) => s + p.amount, 0)
  if (sum <= 0 || sum === net) return parts
  if (to && parts.some(p => p.userId === to)) {
    return parts.map(p => (p.userId === to ? { ...p, amount: p.amount - (sum - net) } : p))
  }
  const out = parts.map(p => ({ ...p, amount: Math.floor((p.amount * net) / sum) }))
  if (out.length) out[0].amount += net - out.reduce((s, p) => s + p.amount, 0)
  return out
}

// desconto de uma pessoa só maior que a parte dela
export function discountPartError(parts: SplitPart[], to: string | null, name: string) {
  return to && parts.some(p => p.userId === to && p.amount < 0) ? `O desconto passa da parte de ${name}.` : null
}

// parte do desconto de cada pessoa da divisão: inteiro para a pessoa escolhida ou na proporção
export function discountShare(d: Discount, userId: string, part: number, sum: number) {
  if (d.to) return d.to === userId ? d.amount : 0
  return sum > 0 ? Math.round((d.amount * part) / sum) : 0
}

// rótulo do desconto: "10% · R$ 12,00" ou só o valor
export function discountLabel(d: Discount, format: (v: number) => string) {
  const pct = d.kind === 'percent' && d.percent ? `${d.percent.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}% · ` : ''
  return `${pct}${format(d.amount)}`
}
