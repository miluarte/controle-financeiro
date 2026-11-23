import { ProgressRing } from '@/components/shared/progress-ring'
import { formatCurrency } from '@/lib/utils'

// CON-1: total de contas do mês (inclusive as fixas no cartão), pago, restante e anel de percentual pago.
// As fixas no cartão já entram na fatura: aparecem em linha própria e não ficam no restante.
export function BillsMonthCard({ total, paid, count, onCard = 0 }: { total: number; paid: number; count: number; onCard?: number }) {
  const rows = [
    { label: `${count} ${count === 1 ? 'conta' : 'contas'}`, value: formatCurrency(total), tone: '' },
    ...(onCard ? [{ label: 'No cartão', value: formatCurrency(onCard), tone: 'text-muted-foreground' }] : []),
    { label: 'Pago', value: formatCurrency(paid), tone: 'text-success' },
    { label: 'Restante', value: formatCurrency(total - onCard - paid), tone: '' },
  ]
  return (
    <section className="flex items-center gap-4 rounded-3xl bg-grouped p-4">
      <ProgressRing value={total ? (paid + onCard) / total : 0} />
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
