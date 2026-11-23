import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

// Resumo em linhas (rótulo | valor) num cartão arredondado, no topo da aba Cartões e da tela da pessoa.
export function SummaryCard({ rows }: { rows: { label: string; value: number; tone?: 'success' }[] }) {
  return (
    <section className="rounded-3xl bg-grouped p-4">
      <dl className="space-y-1">
        {rows.map(r => (
          <div key={r.label} className="flex items-baseline justify-between gap-2">
            <dt className="truncate text-subheadline text-muted-foreground">{r.label}</dt>
            <dd className={cn('shrink-0 text-headline tabular-nums', r.tone === 'success' && 'text-success')}>{formatCurrency(r.value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
