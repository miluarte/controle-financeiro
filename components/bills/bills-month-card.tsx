import { ProgressRing } from '@/components/shared/progress-ring'
import { formatCurrency } from '@/lib/utils'

// CON-1: total das contas a pagar do mês, quanto já foi pago, quanto falta e o anel de percentual pago.
// Gastos fixos no cartão ficam de fora: entram na fatura, na aba Cartões.
export function BillsMonthCard({ total, paid }: { total: number; paid: number }) {
  const rows = [
    { label: 'Total', value: formatCurrency(total), tone: '' },
    { label: 'Pago', value: formatCurrency(paid), tone: 'text-success' },
    { label: 'Falta', value: formatCurrency(total - paid), tone: '' },
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
