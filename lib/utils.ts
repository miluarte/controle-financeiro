export { cn } from "cn"

export function formatCurrency(cents: number): string {
  const value = Number(cents)
  return ((isNaN(value) ? 0 : value) / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export function formatDate(date: string): string {
  // A planilha às vezes devolve a data como timestamp ISO completo
  // (2026-09-10T00:00:00.000Z) em vez de só "2026-09-10". Pegar os
  // 10 primeiros caracteres cobre os dois formatos.
  const [year, month, day] = date.slice(0, 10).split('-')
  return `${day}/${month}/${year}`
}

export function currentMonth(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function monthLabel(month: string): string {
  const [year, m] = month.split('-')
  const date = new Date(Number(year), Number(m) - 1, 1)
  return date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
}

/**
 * Retorna o número efetivo de parcelas pagas de um grupo de parcelamento.
 * Todas as parcelas anteriores ao mês atual são consideradas pagas,
 * independentemente do paidCount armazenado no backend.
 */
export function effectivePaidCount(
  paidCount: number,
  installmentCount: number,
  startDate: string,
): number {
  const start = new Date(startDate.slice(0, 10))
  const now = new Date()
  const monthsElapsed =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth())
  return Math.min(Math.max(paidCount, Math.max(0, monthsElapsed)), installmentCount)
}
