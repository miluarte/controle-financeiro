'use client'

import { EyeClosedLinearIcon, EyeLinearIcon } from '@solar-icons/react'
import { HIDDEN_MONEY as HIDDEN, useHideValues } from '@/hooks/use-hide-values'
import { useMonthOutlook } from '@/hooks/use-month-outlook'
import { Panel } from '@/components/ios/panel'
import { FlowStat } from '@/components/shared/flow-stat'
import { Money } from '@/components/shared/money'
import { addMonths, formatCurrency, monthName } from '@/lib/utils'

// HOM-2: quanto sobra no mês. Saldo de hoje (regime de caixa) mais o que ainda entra, menos o que ainda vence.
// Os três números de baixo somam o de cima.
export function BalanceCard({ month }: { month: string }) {
  const { summary, balance, toPay, toReceive, leftover, loading } = useMonthOutlook(month)
  // sempre ocultos ao abrir o app (ver useHideValues)
  const { hidden, toggle } = useHideValues()

  const show = (v: number) => (hidden ? HIDDEN : formatCurrency(v))

  return (
    <Panel tone="floating" padding="large">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-subheadline text-muted-foreground">Sobra no mês</p>
          {loading
            ? <p className="text-title1 font-bold">…</p>
            : <Money as="p" size="title" className="truncate" cents={leftover} mask={hidden ? HIDDEN : undefined}
                tone={!hidden && leftover < 0 ? 'danger' : 'default'} />}
        </div>
        <button
          type="button"
          onClick={toggle}
          className="-mr-2 flex size-11 shrink-0 items-center justify-center text-muted-foreground active:opacity-(--alpha-half)"
          aria-label={hidden ? 'Mostrar valores' : 'Ocultar valores'}
        >
          {hidden ? <EyeClosedLinearIcon className="size-6" /> : <EyeLinearIcon className="size-6" />}
        </button>
      </div>
      {!loading && (
        <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-separator pt-4">
          <FlowStat direction="balance" label="Saldo hoje" cents={balance} mask={hidden ? HIDDEN : undefined} />
          <FlowStat direction="in" label="A receber" cents={toReceive} mask={hidden ? HIDDEN : undefined} />
          <FlowStat direction="out" label="A pagar" cents={toPay} mask={hidden ? HIDDEN : undefined} />
        </dl>
      )}
      {summary && summary.openingBalance !== 0 && (
        <p className="mt-3 truncate text-footnote text-muted-foreground">
          Saldo inclui {show(summary.openingBalance)} que {summary.openingBalance > 0 ? 'sobrou' : 'faltou'} em {monthName(addMonths(month, -1))}
        </p>
      )}
    </Panel>
  )
}
