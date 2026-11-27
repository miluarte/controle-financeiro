'use client'

import { ArrowDownLinearIcon, ArrowUpLinearIcon, EyeClosedLinearIcon, EyeLinearIcon } from '@solar-icons/react'
import { HIDDEN_MONEY as HIDDEN, useHideValues } from '@/hooks/use-hide-values'
import { useMonthSummary } from '@/hooks/use-month-summary'
import { Panel } from '@/components/ios/panel'
import { Money } from '@/components/shared/money'
import { addMonths, formatCurrency, monthName } from '@/lib/utils'

// HOM-2 e HOM-6: saldo do mês (regime de caixa), receitas, gastos e botão de ocultar.
export function BalanceCard({ month }: { month: string }) {
  const { summary, loading } = useMonthSummary(month)
  // sempre ocultos ao abrir o app (ver useHideValues)
  const { hidden, toggle } = useHideValues()

  const show = (v: number) => (hidden ? HIDDEN : formatCurrency(v))

  return (
    <Panel tone="floating" padding="large">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-subheadline text-muted-foreground">Saldo do mês</p>
          {loading || !summary
            ? <p className="text-title1 font-bold">…</p>
            : <Money as="p" size="title" className="truncate" cents={summary.balance} mask={hidden ? HIDDEN : undefined}
                tone={!hidden && summary.balance < 0 ? 'danger' : 'default'} />}
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
      {summary && summary.openingBalance !== 0 && (
        <p className="mt-1 truncate text-footnote text-muted-foreground">
          Inclui {show(summary.openingBalance)} que {summary.openingBalance > 0 ? 'sobrou' : 'faltou'} em {monthName(addMonths(month, -1))}
        </p>
      )}
      {summary && (
        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-separator pt-4">
          <Total icon={<ArrowUpLinearIcon />} label="Receitas" cents={summary.income} hidden={hidden} />
          <Total icon={<ArrowDownLinearIcon />} label="Gastos" cents={summary.spending} hidden={hidden} />
        </dl>
      )}
    </Panel>
  )
}

function Total({ icon, label, cents, hidden }: { icon: React.ReactNode; label: string; cents: number; hidden: boolean }) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <span className="mt-0.5 shrink-0 [&_svg]:size-5">{icon}</span>
      <div className="min-w-0">
        <dt className="truncate text-subheadline text-muted-foreground">{label}</dt>
        <Money as="dd" size="item" className="truncate" cents={cents} mask={hidden ? HIDDEN : undefined} />
      </div>
    </div>
  )
}
