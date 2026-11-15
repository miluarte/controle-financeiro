export { cn } from "cn"

export function formatCurrency(cents: number): string {
  const value = Number(cents)
  return ((isNaN(value) ? 0 : value) / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export function formatDate(date: string): string {
  const [year, month, day] = date.slice(0, 10).split('-')
  return `${day}/${month}/${year}`
}

// Data local no formato AAAA-MM-DD (sem passar por UTC).
export function todayIso(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function currentMonth(): string {
  return todayIso().slice(0, 7)
}

export function monthRange(month: string) {
  const [y, m] = month.split('-').map(Number)
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
  return { start: `${month}-01`, endExclusive: `${next}-01` }
}

export function monthLabel(month: string): string {
  const [year, m] = month.split('-')
  const date = new Date(Number(year), Number(m) - 1, 1)
  return date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
}

// Rótulo de dia para agrupar a lista: Hoje, Ontem ou "12 de nov."
export function dayLabel(date: string): string {
  const today = todayIso()
  const d = new Date(`${date.slice(0, 10)}T12:00:00`)
  const y = new Date(`${today}T12:00:00`)
  y.setDate(y.getDate() - 1)
  if (date.slice(0, 10) === today) return 'Hoje'
  if (d.toDateString() === y.toDateString()) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
}

export function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}
