'use client'

import { useState } from 'react'
import { EyeLinearIcon, EyeClosedLinearIcon } from '@solar-icons/react'
import { useMonthSummary } from '@/hooks/use-month-summary'
import { addMonths, cn, formatCurrency, monthName } from '@/lib/utils'

const HIDDEN = 'R$ ••••'

function readHidden() {
  try { return localStorage.getItem('troco:hide-balance') === '1' } catch { return false }
}

// HOM-2 e HOM-6: saldo do mês (regime de caixa), botão de ocultar e total guardado.
export function BalanceCard({ month }: { month: string }) {
  const { summary, loading } = useMonthSummary(month)
  const [hidden, setHidden] = useState(readHidden)

  function toggle() {
    const next = !hidden
    setHidden(next)
    try { localStorage.setItem('troco:hide-balance', next ? '1' : '0') } catch {}
  }

  const show = (v: number) => (hidden ? HIDDEN : formatCurrency(v))

  return (
    <section className="rounded-3xl bg-grouped p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-subheadline text-muted-foreground">Saldo do mês</p>
          <p className={cn('truncate text-title1 font-bold tabular-nums', summary && summary.balance < 0 && 'text-destructive')}>
            {loading || !summary ? '…' : show(summary.balance)}
          </p>
        </div>
        <button
          type="button"
          onClick={toggle}
          className="flex size-11 shrink-0 items-center justify-center text-muted-foreground active:opacity-(--alpha-half)"
          aria-label={hidden ? 'Mostrar valores' : 'Ocultar valores'}
        >
          {hidden ? <EyeClosedLinearIcon className="size-6" /> : <EyeLinearIcon className="size-6" />}
        </button>
      </div>
      {summary && summary.openingBalance !== 0 && (
        <p className="mt-1 text-footnote text-muted-foreground">
          Inclui {show(summary.openingBalance)} que {summary.openingBalance > 0 ? 'sobrou' : 'faltou'} em {monthName(addMonths(month, -1))}
        </p>
      )}
      {summary && (
        <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-separator pt-3">
          <div>
            <dt className="text-footnote text-muted-foreground">Receitas</dt>
            <dd className="text-subheadline font-semibold tabular-nums text-success">{show(summary.income)}</dd>
          </div>
          <div>
            <dt className="text-footnote text-muted-foreground">Gastos</dt>
            <dd className="text-subheadline font-semibold tabular-nums">{show(summary.spending)}</dd>
          </div>
          <div>
            <dt className="text-footnote text-muted-foreground">Guardado</dt>
            <dd className="text-subheadline font-semibold tabular-nums">{show(summary.totalSaved)}</dd>
          </div>
        </dl>
      )}
    </section>
  )
}
