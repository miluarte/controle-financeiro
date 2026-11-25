import { Panel } from '@/components/ios/panel'
import { Stat, StatValue } from '@/components/ios/stat'
import { Money } from '@/components/shared/money'
import type { Transaction } from '@/lib/types'

const IN = new Set(['income', 'save_redeem'])

// TRA-4: quantidade, total de entradas e total de saídas do período filtrado.
export function TransactionsSummary({ transactions, tone }: { transactions: Transaction[]; tone?: 'raised' | 'filled' }) {
  const inflow = transactions.filter(t => IN.has(t.type)).reduce((s, t) => s + t.amount, 0)
  const outflow = transactions.filter(t => !IN.has(t.type)).reduce((s, t) => s + t.amount, 0)
  return (
    <Panel as="dl" tone={tone} className="grid grid-cols-3 gap-2">
      <Stat label="Transações"><StatValue>{transactions.length}</StatValue></Stat>
      <Stat label="Entradas"><Money as="dd" size="headline" tone="success" cents={inflow} /></Stat>
      <Stat label="Saídas"><Money as="dd" size="headline" cents={outflow} /></Stat>
    </Panel>
  )
}
