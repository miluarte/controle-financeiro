import { ProgressRing } from '@/components/shared/progress-ring'
import { formatCurrency } from '@/lib/utils'

// CON-1: total de contas do mês, pago, restante e anel de percentual pago.
export function BillsMonthCard({ total, paid, count }: { total: number; paid: number; count: number }) {
  const rows = [
    { label: `${count} ${count === 1 ? 'conta' : 'contas'}`, value: formatCurrency(total), tone: '' },
    { label: 'Pago', value: formatCurrency(paid), tone: 'text-success' },
    { label: 'Restante', value: formatCurrency(total - paid), tone: '' },
  ]
  return (
    <section className="flex items-center gap-4 rounded-3xl bg-grouped p-4">
      <ProgressRing value={total ? paid / total : 0} />
      <dl className="flex-1 space-y-1">
        {rows.map(r => (
          <div key={r.label} className="flex items-baseline justify-between gap-2">
            <dt className="text-subheadline text-muted-foreground">{r.label}</dt>
            <dd className={`text-subheadline font-semibold tabular-nums ${r.tone}`}>{r.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
