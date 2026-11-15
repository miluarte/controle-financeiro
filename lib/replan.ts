import type { Category, Transaction } from './types'
import { addMonths, currentMonth } from './utils'

// 7.8 e 5.11: replanejamento de metas a partir do histórico real.

export type Rhythm = 'save' | 'balance' | 'loose'
export const RHYTHM_FACTOR: Record<Rhythm, number> = { save: 0.9, balance: 1, loose: 1.15 }
export const UNLOCK_EXPENSES = 30

export interface CategoryAverage {
  category: Category
  average: number          // média mensal em centavos
  currentGoal: number | null
}

export interface SpendingProfile {
  months: number           // meses do período-base
  baseLabel: string        // "set. a out." ou "nov."
  expenseCount: number
  averageTotal: number
  essential: number        // média mensal Essencial
  desire: number           // média mensal Desejo (inclui sem classe e sem categoria)
  rows: CategoryAverage[]
}

// Arredonda para o múltiplo de R$ 10 mais próximo (em centavos).
export const round10 = (cents: number) => Math.round(cents / 1000) * 1000

function monthsBetween(a: string, b: string) {
  const [ya, ma] = a.split('-').map(Number)
  const [yb, mb] = b.split('-').map(Number)
  return (yb - ya) * 12 + (mb - ma) + 1
}

// Período-base "até agora": do primeiro mês com gasto até o último mês completo.
// Sem nenhum mês completo, usa o mês atual.
export function spendingProfile(
  transactions: Transaction[], categories: Category[], goals: Map<string, number | null>,
): SpendingProfile {
  const expenses = transactions.filter(t => t.type === 'expense' && t.status === 'confirmed')
  const cur = currentMonth()
  const first = expenses.reduce<string | null>((m, t) => (!m || t.date.slice(0, 7) < m ? t.date.slice(0, 7) : m), null)
  const lastFull = addMonths(cur, -1)
  const end = first && first <= lastFull ? lastFull : cur
  const start = first && first <= end ? first : end
  const months = Math.max(1, monthsBetween(start, end))
  const inBase = expenses.filter(t => t.date.slice(0, 7) >= start && t.date.slice(0, 7) <= end)

  const totals = new Map<string, number>()
  for (const t of inBase) if (t.categoryId) totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + t.amount)

  const rows = categories
    .filter(c => c.type === 'expense' && c.active)
    .map(c => ({ category: c, average: Math.round((totals.get(c.id) ?? 0) / months), currentGoal: goals.get(c.id) ?? null }))
    .sort((a, b) => b.average - a.average)

  const essential = rows.filter(r => r.category.class === 'essential').reduce((s, r) => s + r.average, 0)
  // média de todo o gasto, inclusive sem categoria (que entra como Desejo na barra)
  const averageTotal = Math.round(inBase.reduce((s, t) => s + t.amount, 0) / months)
  const fmt = (m: string) => new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1, 1)
    .toLocaleString('pt-BR', { month: 'short' }).replace('.', '')
  return {
    months,
    baseLabel: start === end ? fmt(start) : `${fmt(start)} a ${fmt(end)}`,
    expenseCount: expenses.length,
    averageTotal,
    essential,
    desire: averageTotal - essential,
    rows,
  }
}

// Leitura do equilíbrio entre Essencial e Desejo (etapa 1).
export function balanceMessage(p: SpendingProfile): string | null {
  if (!p.averageTotal) return null
  const essentialPct = p.essential / p.averageTotal
  if (essentialPct >= 0.7) return 'O essencial ocupa quase tudo. Sobra pouco espaço para cortar sem aperto.'
  if (essentialPct <= 0.5) return 'Metade ou mais vai para desejos. Dá para economizar sem mexer no essencial.'
  return 'Seus gastos estão equilibrados entre o essencial e os desejos.'
}

// Meta proposta (etapa 2). Sem gasto recente, mantém a meta atual.
export function proposedGoal(row: CategoryAverage, rhythm: Rhythm): number | null {
  if (!row.average) return row.currentGoal
  return Math.max(1000, round10(row.average * RHYTHM_FACTOR[rhythm]))
}
