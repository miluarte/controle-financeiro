import type { Transaction } from './types'
import { currentMonth, daysInMonth, todayIso } from './utils'

// Cálculos da seção 7 (7.2, 7.3, 7.4), feitos sobre os lançamentos reais do mês.

// Dia "de hoje" dentro do mês escolhido: mês passado conta inteiro, mês futuro ainda não começou.
export function elapsedDays(month: string): number {
  const cur = currentMonth()
  if (month < cur) return daysInMonth(month)
  if (month > cur) return 0
  return Number(todayIso().slice(8, 10))
}

// Gasto acumulado por dia (índice 0 = dia 1).
export function cumulativeSpending(transactions: Transaction[], month: string): number[] {
  const days = daysInMonth(month)
  const perDay = new Array(days).fill(0)
  for (const t of transactions) {
    if (t.type !== 'expense' || t.status !== 'confirmed') continue
    const d = Number(t.date.slice(8, 10))
    if (d >= 1 && d <= days) perDay[d - 1] += t.amount
  }
  let acc = 0
  return perDay.map(v => (acc += v))
}

export type Pace = 'below' | 'on' | 'above'

// 7.3: compara o gasto acumulado com a reta ideal até hoje, com margem de 5%.
export function paceStatus(spent: number, budget: number, day: number, days: number): Pace {
  if (budget <= 0 || day <= 0) return 'on'
  const ideal = (budget * day) / days
  if (spent > ideal * 1.05) return 'above'
  if (spent < ideal * 0.95) return 'below'
  return 'on'
}

// 7.2: livre por dia = resta ÷ dias que faltam (mínimo 1).
export function freePerDay(remaining: number, month: string): number {
  const left = Math.max(1, daysInMonth(month) - elapsedDays(month) + (month === currentMonth() ? 1 : 0))
  return Math.floor(Math.max(0, remaining) / left)
}

// 7.4: gasto de 1 até o dia N.
export function spendingUntilDay(transactions: Transaction[], day: number): number {
  return transactions
    .filter(t => t.type === 'expense' && t.status === 'confirmed' && Number(t.date.slice(8, 10)) <= day)
    .reduce((s, t) => s + t.amount, 0)
}
