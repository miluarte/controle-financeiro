'use client'

import { useState } from 'react'
import { ArrowDownLinearIcon, ArrowUpLinearIcon, EyeClosedLinearIcon, EyeLinearIcon, WalletLinearIcon } from '@solar-icons/react'
import { useMonthOutlook } from '@/hooks/use-month-outlook'
import { Panel } from '@/components/ios/panel'
import { Money } from '@/components/shared/money'
import { addMonths, formatCurrency, monthName } from '@/lib/utils'

const HIDDEN = 'R$ ••••'

// Valores sempre ocultos ao abrir o app. A escolha vale só enquanto o app está aberto
// (navegar entre telas mantém); não é gravada no aparelho.
let hiddenThisSession = true

// HOM-2: quanto sobra no mês. Saldo de hoje (regime de caixa) mais o que ainda entra, menos o que ainda vence.
// Os três números de baixo somam o de cima.
export function BalanceCard({ month }: { month: string }) {
  const { summary, balance, toPay, toReceive, leftover, loading } = useMonthOutlook(month)
  const [hidden, setHidden] = useState(hiddenThisSession)

  function toggle() {
    hiddenThisSession = !hidden
    setHidden(hiddenThisSession)
  }

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
          <Total icon={<WalletLinearIcon />} label="Saldo hoje" cents={balance} hidden={hidden} />
          <Total icon={<ArrowUpLinearIcon />} label="A receber" cents={toReceive} hidden={hidden} />
          <Total icon={<ArrowDownLinearIcon />} label="A pagar" cents={toPay} hidden={hidden} />
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

function Total({ icon, label, cents, hidden }: { icon: React.ReactNode; label: string; cents: number; hidden: boolean }) {
  return (
    <div className="flex min-w-0 items-start gap-1.5">
      <span className="mt-0.5 shrink-0 [&_svg]:size-4">{icon}</span>
      <div className="min-w-0">
        <dt className="truncate text-footnote text-muted-foreground">{label}</dt>
        <Money as="dd" size="item" className="truncate" cents={cents} mask={hidden ? HIDDEN : undefined}
          tone={!hidden && cents < 0 ? 'danger' : 'default'} />
      </div>
    </div>
  )
}
