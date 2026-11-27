import type { Transaction, Wallet } from './types'
import { openInvoiceRef } from './invoice'
import { addMonths, todayIso } from './utils'

// Situação de cada parcela de uma compra parcelada (tela de parcelas do detalhe).
// fechada: a fatura dela já fechou (ou, sem fatura, o mês já passou); atual: a fatura aberta hoje
// (ou o mês atual); futura: depois disso.
export type InstallmentStatus = 'closed' | 'current' | 'future'

export interface InstallmentLine {
  n: number
  date: string
  amount: number | null
  status: InstallmentStatus
  // lançada antes do app (só a data é conhecida)
  before: boolean
}

export const INSTALLMENT_STATUS_LABEL: Record<InstallmentStatus, string> = {
  closed: 'Fechada',
  current: 'Atual',
  future: 'Futura',
}

function statusOf(ref: string, current: string): InstallmentStatus {
  return ref < current ? 'closed' : ref === current ? 'current' : 'future'
}

// parcela k cai na data da compra + k-1 meses (mesmo dia, limitado ao fim do mês)
function dateOf(firstDate: string, k: number): string {
  const month = addMonths(firstDate.slice(0, 7), k - 1)
  const [y, m] = month.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  return `${month}-${String(Math.min(Number(firstDate.slice(8, 10)), last)).padStart(2, '0')}`
}

// Todas as parcelas, de 1 a N. As lançadas no app vêm do banco; as anteriores (compra que já estava
// andando quando foi registrada) entram só com a data e ficam como fechadas.
export function installmentLines(
  rows: Transaction[], total: number, firstDate: string | null, wallet: Wallet | undefined, today = todayIso(),
): InstallmentLine[] {
  const credit = wallet?.type === 'credit' && wallet.closingDay != null
  const current = credit ? openInvoiceRef({ closingDay: wallet!.closingDay, closingDayInclusive: false }, today) : today.slice(0, 7)
  const byN = new Map(rows.filter(r => r.installmentN != null).map(r => [r.installmentN!, r]))
  const start = firstDate ?? rows[0]?.date ?? today
  const first = Math.min(...byN.keys())
  const lines: InstallmentLine[] = []
  for (let n = 1; n <= total; n++) {
    const row = byN.get(n)
    if (row) {
      const ref = credit && row.invoiceRef ? row.invoiceRef.slice(0, 7) : row.date.slice(0, 7)
      lines.push({ n, date: row.date, amount: row.amount, status: statusOf(ref, current), before: false })
    } else if (n < first) {
      lines.push({ n, date: dateOf(start, n), amount: null, status: 'closed', before: true })
    }
  }
  return lines
}
