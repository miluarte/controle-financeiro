import type { Transaction } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'

const IN = new Set(['income', 'save_redeem'])

// TRA-4: quantidade, total de entradas e total de saídas do período filtrado.
export function TransactionsSummary({ transactions }: { transactions: Transaction[] }) {
  const inflow = transactions.filter(t => IN.has(t.type)).reduce((s, t) => s + t.amount, 0)
  const outflow = transactions.filter(t => !IN.has(t.type)).reduce((s, t) => s + t.amount, 0)
  return (
    <dl className="grid grid-cols-3 gap-2 rounded-3xl bg-grouped p-4">
      <div>
        <dt className="text-footnote text-muted-foreground">Transações</dt>
        <dd className="text-headline tabular-nums">{transactions.length}</dd>
      </div>
      <div>
        <dt className="text-footnote text-muted-foreground">Entradas</dt>
        <dd className="text-headline tabular-nums text-success">{formatCurrency(inflow)}</dd>
      </div>
      <div>
        <dt className="text-footnote text-muted-foreground">Saídas</dt>
        <dd className="text-headline tabular-nums">{formatCurrency(outflow)}</dd>
      </div>
    </dl>
  )
}
