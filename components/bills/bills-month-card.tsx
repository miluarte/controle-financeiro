import { Panel } from '@/components/ios/panel'
import { Stat } from '@/components/ios/stat'
import { Money } from '@/components/shared/money'
import { ProgressRing } from '@/components/shared/progress-ring'

// CON-1: total das contas do mês (inclusive as fixas no cartão), quanto já foi pago, quanto falta e o anel de percentual pago.
export function BillsMonthCard({ total, paid }: { total: number; paid: number }) {
  const rows = [
    { label: 'Total', value: total, tone: 'default' as const },
    { label: 'Pago', value: paid, tone: 'success' as const },
    { label: 'Falta', value: total - paid, tone: 'default' as const },
  ]
  return (
    <Panel className="flex items-center gap-4">
      <ProgressRing value={total ? paid / total : 0} />
      <dl className="flex-1 space-y-1">
        {rows.map(r => (
          <Stat key={r.label} layout="inline" label={r.label}>
            <Money as="dd" size="inherit" className="shrink-0 text-subheadline font-semibold" tone={r.tone} cents={r.value} />
          </Stat>
        ))}
      </dl>
    </Panel>
  )
}
