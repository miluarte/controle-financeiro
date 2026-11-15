import { Badge } from '@/components/ui/badge'
import { paceStatus, type Pace } from '@/lib/analysis'
import { formatCurrency } from '@/lib/utils'

const PACE_LABEL: Record<Pace, { text: string; variant: 'success' | 'secondary' | 'destructive' }> = {
  below: { text: 'Abaixo do ritmo', variant: 'success' },
  on: { text: 'No ritmo', variant: 'secondary' },
  above: { text: 'Acima do ritmo', variant: 'destructive' },
}

// ANA-2: linha tracejada do ritmo ideal (0 até o orçamento) e linha do gasto real até hoje.
export function PaceChart({
  cumulative, budget, day,
}: { cumulative: number[]; budget: number; day: number }) {
  const days = cumulative.length
  const spent = day > 0 ? cumulative[day - 1] : 0
  const max = Math.max(budget, cumulative[days - 1] ?? 0, 1)
  const W = 300
  const H = 120
  const x = (d: number) => (d / days) * W
  const y = (v: number) => H - (v / max) * H
  const real = cumulative.slice(0, day).map((v, i) => `${x(i + 1)},${y(v)}`)
  const status = paceStatus(spent, budget, day, days)
  const label = PACE_LABEL[status]

  return (
    <section className="space-y-3 rounded-3xl bg-grouped p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-headline">Ritmo do mês</h2>
        <Badge variant={label.variant}>{label.text}</Badge>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-32 w-full overflow-visible" preserveAspectRatio="none" aria-hidden>
        <line x1={0} y1={y(0)} x2={W} y2={y(budget)} className="stroke-muted-foreground" strokeWidth={1.5}
          strokeDasharray="5 5" vectorEffect="non-scaling-stroke" />
        {real.length > 0 && (
          <polyline points={`0,${H} ${real.join(' ')}`} fill="none" className="stroke-tint" strokeWidth={2.5}
            strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        )}
      </svg>
      <p className="text-footnote text-muted-foreground">
        Ideal até hoje: {formatCurrency(Math.round((budget * day) / days))} · Real: {formatCurrency(spent)}
      </p>
    </section>
  )
}
