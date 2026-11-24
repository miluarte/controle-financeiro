'use client'

import { useState } from 'react'
import { EyeLinearIcon, EyeClosedLinearIcon } from '@solar-icons/react'
import { useMonthOutlook } from '@/hooks/use-month-outlook'
import { addMonths, cn, formatCurrency, monthName } from '@/lib/utils'

const HIDDEN = 'R$ ••••'

function readHidden() {
  try { return localStorage.getItem('troco:hide-balance') === '1' } catch { return false }
}

// HOM-2: quanto sobra no mês. Saldo de hoje (regime de caixa) mais o que ainda entra, menos o que ainda vence.
// Os três números de baixo somam o de cima.
export function BalanceCard({ month }: { month: string }) {
  const { summary, balance, toPay, toReceive, leftover, loading } = useMonthOutlook(month)
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
          <p className="text-subheadline text-muted-foreground">Sobra no mês</p>
          <p className={cn('truncate text-title1 font-bold tabular-nums', !loading && leftover < 0 && 'text-destructive')}>
            {loading ? '…' : show(leftover)}
          </p>
        </div>
        <button
          type="button"
          onClick={toggle}
          className="flex size-11 shrink-0 items-center justify-center text-muted-foreground active:opacity-50"
          aria-label={hidden ? 'Mostrar valores' : 'Ocultar valores'}
        >
          {hidden ? <EyeClosedLinearIcon className="size-6" /> : <EyeLinearIcon className="size-6" />}
        </button>
      </div>
      {!loading && (
        <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-separator pt-3">
          <div>
            <dt className="text-footnote text-muted-foreground">Saldo hoje</dt>
            <dd className={cn('text-subheadline font-semibold tabular-nums', balance < 0 && 'text-destructive')}>{show(balance)}</dd>
          </div>
          <div>
            <dt className="text-footnote text-muted-foreground">A receber</dt>
            <dd className="text-subheadline font-semibold tabular-nums text-success">{show(toReceive)}</dd>
          </div>
          <div>
            <dt className="text-footnote text-muted-foreground">A pagar</dt>
            <dd className="text-subheadline font-semibold tabular-nums">{show(toPay)}</dd>
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
