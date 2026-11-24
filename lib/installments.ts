import type { Wallet } from './types'
import { invoiceDueDate, openInvoiceRef } from './invoice'
import { addMonths } from './utils'

// Data (AAAA-MM-DD) da parcela n de uma compra: data da compra + n-1 meses, sem passar do fim do mês.
export function installmentDate(purchaseDate: string, n: number): string {
  const month = addMonths(purchaseDate.slice(0, 7), n - 1)
  const [y, m] = month.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  return `${month}-${String(Math.min(Number(purchaseDate.slice(8, 10)), last)).padStart(2, '0')}`
}

// Compra parcelada já em andamento: primeira parcela que ainda não foi paga.
// No cartão de crédito, a primeira cuja fatura vence hoje ou depois.
// Nas outras formas de pagamento, a primeira do mês atual em diante.
export function firstOpenInstallment(
  purchaseDate: string, installments: number, today: string,
  card?: Pick<Wallet, 'type' | 'closingDay' | 'dueDay'> | null,
): number {
  const month = today.slice(0, 7)
  for (let n = 1; n <= installments; n++) {
    const date = installmentDate(purchaseDate, n)
    if (card?.type === 'credit' && card.closingDay && card.dueDay) {
      const ref = openInvoiceRef({ closingDay: card.closingDay, closingDayInclusive: false }, date)
      if (invoiceDueDate(card, ref) >= today) return n
    } else if (date.slice(0, 7) >= month) {
      return n
    }
  }
  return installments
}
