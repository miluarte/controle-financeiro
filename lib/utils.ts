import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// tailwind-merge precisa conhecer os tokens de tipografia e espaçamento do tema iOS
// (app/globals.css). Sem isso, "text-headline" é tratado como cor e apaga "text-primary-foreground".
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["large-title", "title1", "title2", "title3", "headline", "body", "callout", "subheadline", "footnote", "caption1", "caption2"],
      spacing: ["row", "tabbar"],
      radius: ["glass"],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// NAV-4: moeda padrão do perfil (definida pelo ThemeSync ao carregar o perfil).
let currency = 'BRL'
export function setCurrency(code: string) {
  currency = code || 'BRL'
}

export function formatCurrency(cents: number): string {
  const value = Number(cents)
  return ((isNaN(value) ? 0 : value) / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency,
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

// Soma meses a um "AAAA-MM".
export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

// "nov" ou "novembro"
export function monthName(month: string, style: 'short' | 'long' = 'long'): string {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleString('pt-BR', { month: style }).replace('.', '')
}

// Valor digitado em reais ("12,50") para centavos, sem passar por número decimal.
export function parseCents(text: string): number | null {
  const clean = text.replace(/[^\d,.-]/g, '').trim()
  if (!clean) return null
  const negative = clean.startsWith('-')
  const [intPart, decPart = ''] = clean.replace('-', '').replace(/\.(?=\d{3}(\D|$))/g, '').split(/[,.]/)
  const cents = Number(intPart || '0') * 100 + Number((decPart + '00').slice(0, 2))
  return Number.isFinite(cents) ? (negative ? -cents : cents) : null
}


export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
