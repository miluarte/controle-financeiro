import type { OwnWallet } from './types'
import { addMonths } from './utils'

// Regras de fatura do lado do cliente (espelham as funções do banco, seção 7.5).

// Mês (AAAA-MM) em que vence a fatura de referência `ref` (AAAA-MM).
export function invoiceDueMonth(w: Pick<OwnWallet, 'closingDay' | 'dueDay'>, ref: string): string {
  return (w.dueDay ?? 0) > (w.closingDay ?? 0) ? ref : addMonths(ref, 1)
}

// Data de vencimento AAAA-MM-DD.
export function invoiceDueDate(w: Pick<OwnWallet, 'closingDay' | 'dueDay'>, ref: string): string {
  const m = invoiceDueMonth(w, ref)
  const [y, mm] = m.split('-').map(Number)
  const last = new Date(y, mm, 0).getDate()
  return `${m}-${String(Math.min(w.dueDay ?? 1, last)).padStart(2, '0')}`
}

// Referência da fatura que vence no mês `month`.
export function invoiceRefDueIn(w: Pick<OwnWallet, 'closingDay' | 'dueDay'>, month: string): string {
  return (w.dueDay ?? 0) > (w.closingDay ?? 0) ? month : addMonths(month, -1)
}

// Fatura aberta hoje (a que ainda vai fechar): referência AAAA-MM.
export function openInvoiceRef(w: Pick<OwnWallet, 'closingDay' | 'closingDayInclusive'>, today: string): string {
  const day = Number(today.slice(8, 10))
  const month = today.slice(0, 7)
  const closing = w.closingDay ?? 31
  return day < closing || (day === closing && w.closingDayInclusive) ? month : addMonths(month, 1)
}
