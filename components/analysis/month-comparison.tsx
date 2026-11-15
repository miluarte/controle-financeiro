import { formatCurrency, monthName } from '@/lib/utils'

// ANA-4: comparação com o mês anterior até o mesmo dia.
export function MonthComparison({
  current, previous, prevMonth, day,
}: { current: number; previous: number; prevMonth: string; day: number }) {
  const diff = current - previous
  const pct = previous ? Math.round((Math.abs(diff) / previous) * 100) : 0

  return (
    <section className="space-y-1 rounded-3xl bg-grouped p-4">
      <p className="text-subheadline text-muted-foreground">vs. {monthName(prevMonth)} até dia {day}</p>
      {previous === 0 ? (
        <p className="text-body">Sem gastos em {monthName(prevMonth)} até o dia {day}, então ainda não dá para comparar.</p>
      ) : (
        <p className="text-body">
          <span className={diff > 0 ? 'font-semibold text-destructive' : 'font-semibold text-success'}>
            {diff > 0 ? `${pct}% a mais` : diff < 0 ? `${pct}% a menos` : 'Igual'}
          </span>{' '}
          ({formatCurrency(current)} agora, {formatCurrency(previous)} em {monthName(prevMonth)})
        </p>
      )}
    </section>
  )
}
