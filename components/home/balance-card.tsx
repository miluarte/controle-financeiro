'use client'

import { useState } from 'react'
import { ArrowDownLinearIcon, ArrowUpLinearIcon, EyeClosedLinearIcon, EyeLinearIcon } from '@solar-icons/react'
import { useMonthSummary } from '@/hooks/use-month-summary'
import { addMonths, cn, formatCurrency, monthName } from '@/lib/utils'

const HIDDEN = 'R$ ••••'

// Valores sempre ocultos ao abrir o app. A escolha vale só enquanto o app está aberto
// (navegar entre telas mantém); não é gravada no aparelho.
let hiddenThisSession = true

// HOM-2 e HOM-6: saldo do mês (regime de caixa), receitas, gastos e botão de ocultar.
export function BalanceCard({ month }: { month: string }) {
  const { summary, loading } = useMonthSummary(month)
  const [hidden, setHidden] = useState(hiddenThisSession)

  function toggle() {
    hiddenThisSession = !hidden
    setHidden(hiddenThisSession)
  }

  const show = (v: number) => (hidden ? HIDDEN : formatCurrency(v))

  return (
    <section className="rounded-3xl bg-grouped p-5 shadow-floating">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-subheadline text-muted-foreground">Saldo do mês</p>
          <p className={cn('truncate text-title1 font-bold tabular-nums', !hidden && summary && summary.balance < 0 && 'text-destructive')}>
            {loading || !summary ? '…' : show(summary.balance)}
          </p>
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
          <Total icon={<ArrowUpLinearIcon />} label="Receitas" value={show(summary.income)} />
          <Total icon={<ArrowDownLinearIcon />} label="Gastos" value={show(summary.spending)} />
        </dl>
      )}
    </section>
  )
}

function Total({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <span className="mt-0.5 shrink-0 [&_svg]:size-5">{icon}</span>
      <div className="min-w-0">
        <dt className="truncate text-subheadline text-muted-foreground">{label}</dt>
        <dd className="truncate text-subheadline font-bold tabular-nums">{value}</dd>
      </div>
    </div>
  )
}
