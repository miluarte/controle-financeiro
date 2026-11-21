import type { ReceiptItem } from './receipt'
import { formatCurrency } from './utils'

// Divisão de uma compra no cartão entre pessoas (valores em centavos).
export type SplitMode = 'item' | 'equal' | 'value'
// dono de item que vale para todos: o item é dividido igualmente entre quem está na divisão
export const SPLIT_ALL = 'split'

export interface SplitPart { userId: string; amount: number }

// Divide em partes iguais em centavos; o resto vai para as primeiras pessoas.
export function equalParts(total: number, n: number) {
  const base = Math.floor(total / n)
  return Array.from({ length: n }, (_, i) => base + (i < total - base * n ? 1 : 0))
}

// people: ids na ordem de exibição, com quem divide primeiro (fica com os centavos que sobram).
// Item sem dono é de quem divide. Por item, a soma é levada ao valor da compra (desconto, frete…).
export function splitParts({ mode, total, people, items, values }: {
  mode: SplitMode; total: number; people: string[]; items: ReceiptItem[]; values: Record<string, number>
}): { parts: SplitPart[]; error: string | null } {
  const zero = people.map(userId => ({ userId, amount: 0 }))
  if (people.length < 2) return { parts: zero, error: 'Escolha pelo menos duas pessoas.' }
  if (total <= 0) return { parts: zero, error: null }

  if (mode === 'equal') {
    const eq = equalParts(total, people.length)
    return { parts: people.map((userId, i) => ({ userId, amount: eq[i] })), error: null }
  }

  if (mode === 'value') {
    const fixed = people.filter(p => (values[p] ?? 0) > 0)
    const auto = people.filter(p => !fixed.includes(p))
    const rest = total - fixed.reduce((s, p) => s + values[p], 0)
    if (rest < 0) return { parts: zero, error: `As partes passam do valor em ${formatCurrency(-rest)}.` }
    if (!auto.length && rest > 0) return { parts: zero, error: `Faltam ${formatCurrency(rest)} para fechar o valor.` }
    const eq = auto.length ? equalParts(rest, auto.length) : []
    return { parts: people.map(userId => ({ userId, amount: fixed.includes(userId) ? values[userId] : eq[auto.indexOf(userId)] })), error: null }
  }

  // por item
  const base = new Map(people.map(p => [p, 0]))
  let shared = 0
  for (const it of items) {
    const v = it.amount || 0
    if (it.owner === SPLIT_ALL) shared += v
    else {
      const owner = it.owner && base.has(it.owner) ? it.owner : people[0]
      base.set(owner, base.get(owner)! + v)
    }
  }
  equalParts(shared, people.length).forEach((v, i) => base.set(people[i], base.get(people[i])! + v))
  const sum = [...base.values()].reduce((s, v) => s + v, 0)
  if (sum <= 0) return { parts: zero, error: 'Informe o valor dos itens.' }
  const parts = people.map(userId => ({ userId, amount: Math.floor((base.get(userId)! * total) / sum) }))
  parts[0].amount += total - parts.reduce((s, p) => s + p.amount, 0)
  return { parts, error: null }
}
