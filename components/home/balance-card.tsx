'use client'

import { useState } from 'react'
import { EyeBoldDuotoneIcon, EyeClosedBoldDuotoneIcon } from '@solar-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useMonthSummary } from '@/hooks/use-month-summary'
import { cn, formatCurrency, monthLabel } from '@/lib/utils'

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
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm text-muted-foreground">Saldo de {monthLabel(month)}</p>
            <p className={cn('text-3xl font-semibold', summary && summary.balance < 0 && 'text-destructive')}>
              {loading || !summary ? '...' : show(summary.balance)}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={toggle} aria-label={hidden ? 'Mostrar valores' : 'Ocultar valores'}>
            {hidden ? <EyeClosedBoldDuotoneIcon className="size-6" /> : <EyeBoldDuotoneIcon className="size-6" />}
          </Button>
        </div>
        {summary && (
          <dl className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Entrou</dt>
              <dd className="font-medium">{show(summary.income)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Gastos</dt>
              <dd className="font-medium">{show(summary.spending)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Guardado</dt>
              <dd className="font-medium">{show(summary.totalSaved)}</dd>
            </div>
          </dl>
        )}
      </CardContent>
    </Card>
  )
}
