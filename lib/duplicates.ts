import type { Transaction } from './types'
import { daysBetween } from './late-fee'

// Compras possivelmente repetidas: mesmo valor, mesma carteira, até 1 dia de diferença e
// mesmo local (ou local vazio). Parcelas da mesma compra e pares já marcados como
// "não é repetida" (source_data.not_duplicate) ficam de fora.
const norm = (s: string | null) => (s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]/g, '')

function dismissed(t: Transaction): string[] {
  const v = t.sourceData?.not_duplicate
  return Array.isArray(v) ? (v as string[]) : []
}

export function findDuplicates(list: Transaction[]): [Transaction, Transaction][] {
  const expenses = list.filter(t => t.type === 'expense' && t.status === 'confirmed')
  const pairs: [Transaction, Transaction][] = []
  const used = new Set<string>()
  for (let i = 0; i < expenses.length; i++) {
    const a = expenses[i]
    if (used.has(a.id)) continue
    for (let j = i + 1; j < expenses.length; j++) {
      const b = expenses[j]
      if (used.has(b.id) || a.amount !== b.amount || a.walletId !== b.walletId) continue
      if (a.installmentGroupId && a.installmentGroupId === b.installmentGroupId) continue
      if (Math.abs(daysBetween(a.date, b.date)) > 1) continue
      const pa = norm(a.place), pb = norm(b.place)
      if (pa && pb && !pa.includes(pb) && !pb.includes(pa)) continue
      if (dismissed(a).includes(b.id) || dismissed(b).includes(a.id)) continue
      pairs.push([a, b]); used.add(a.id); used.add(b.id)
      break
    }
  }
  return pairs
}
