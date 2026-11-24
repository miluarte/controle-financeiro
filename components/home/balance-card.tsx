'use client'

import { MonthSelector } from '@/components/shared/month-selector'
import { useHideValues } from '@/hooks/use-hide-values'
import { useMonthOutlook } from '@/hooks/use-month-outlook'
import { addMonths, cn, formatCurrency, monthName } from '@/lib/utils'

const HIDDEN = 'R$ ••••'

// HOM-2: quanto sobra no mês. Saldo de hoje (regime de caixa) mais o que ainda entra, menos o que ainda vence.
// Os três números de baixo somam o de cima. O olho de ocultar valores fica no cabeçalho (HomeHeader).
export function BalanceCard({ month }: { month: string }) {
  const { summary, balance, toPay, toReceive, leftover, loading } = useMonthOutlook(month)
  const { hidden } = useHideValues()

  const show = (v: number) => (hidden ? HIDDEN : formatCurrency(v))

  return (
    <section className="rounded-3xl bg-grouped p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-subheadline text-muted-foreground">Sobra no mês</p>
        <MonthSelector />
      </div>
      <p className={cn('truncate text-large-title font-bold tabular-nums', !loading && leftover < 0 && 'text-destructive')}>
        {loading ? '…' : show(leftover)}
      </p>
      {!loading && (
        <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-separator pt-3">
          <div className="min-w-0">
            <dt className="truncate text-footnote text-muted-foreground">Saldo hoje</dt>
            <dd className={cn('truncate text-subheadline font-semibold tabular-nums', balance < 0 && 'text-destructive')}>{show(balance)}</dd>
          </div>
          <div className="min-w-0">
            <dt className="truncate text-footnote text-muted-foreground">A receber</dt>
            <dd className="truncate text-subheadline font-semibold tabular-nums text-success">{show(toReceive)}</dd>
          </div>
          <div className="min-w-0">
            <dt className="truncate text-footnote text-muted-foreground">A pagar</dt>
            <dd className="truncate text-subheadline font-semibold tabular-nums">{show(toPay)}</dd>
          </div>
        </dl>
      )}
      {summary && summary.openingBalance !== 0 && (
        <p className="mt-3 text-footnote text-muted-foreground">
          Saldo inclui {show(summary.openingBalance)} que {summary.openingBalance > 0 ? 'sobrou' : 'faltou'} em {monthName(addMonths(month, -1))}
        </p>
      )}
    </section>
  )
}
