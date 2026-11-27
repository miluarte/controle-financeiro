import { Panel } from '@/components/ios/panel'
import { FlowStat } from '@/components/shared/flow-stat'
import type { Transaction } from '@/lib/types'

const IN = new Set(['income', 'save_redeem'])

// TRA-4: total de entradas e total de saídas do período filtrado, com as setas do card de saldo do Início.
export function TransactionsSummary({ transactions, tone }: { transactions: Transaction[]; tone?: 'raised' | 'filled' }) {
  const inflow = transactions.filter(t => IN.has(t.type)).reduce((s, t) => s + t.amount, 0)
  const outflow = transactions.filter(t => !IN.has(t.type)).reduce((s, t) => s + t.amount, 0)
  return (
    <Panel as="dl" tone={tone} className="grid grid-cols-2 gap-3">
      <FlowStat direction="in" label="Entradas" cents={inflow} />
      <FlowStat direction="out" label="Saídas" cents={outflow} />
    </Panel>
  )
}
