import { daysBetween } from './late-fee'
import type { StatementItem } from './statement'
import type { Transaction } from './types'

// Compara a fatura do banco com as compras do app nessa fatura.
export interface Reconciliation {
  matched: { item: StatementItem; tx: Transaction }[]
  missing: StatementItem[]   // na fatura, não no app
  extra: Transaction[]       // no app, não na fatura
}

export function reconcile(items: StatementItem[], txs: Transaction[]): Reconciliation {
  const free = new Set(txs.map(t => t.id))
  const matched: Reconciliation['matched'] = []
  const missing: StatementItem[] = []
  const take = (pred: (t: Transaction) => boolean) => {
    const t = txs.find(x => free.has(x.id) && pred(x))
    if (t) free.delete(t.id)
    return t
  }
  // 1º parcelas (número e total da parcela), 2º mesmo valor até 3 dias, 3º mesmo valor na fatura
  const ordered = [...items].sort((a, b) => Number(!!b.installmentN) - Number(!!a.installmentN))
  for (const item of ordered) {
    const tx =
      (item.installmentN != null ? take(t => t.amount === item.amount && t.installmentN === item.installmentN && t.installmentsTotal === item.installmentsTotal) : undefined)
      ?? take(t => t.amount === item.amount && Math.abs(daysBetween(t.date, item.date)) <= 3)
      ?? take(t => t.amount === item.amount)
    if (tx) matched.push({ item, tx })
    else missing.push(item)
  }
  return { matched, missing, extra: txs.filter(t => free.has(t.id)) }
}
