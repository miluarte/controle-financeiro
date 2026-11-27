'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { CardLinearIcon } from '@solar-icons/react'
import { AlertCard } from '@/components/shared/alert-card'
import { Money } from '@/components/shared/money'
import { useCardInvoices, type OwnInvoice } from '@/hooks/use-card-invoices'
import { HIDDEN_MONEY, useHideValues } from '@/hooks/use-hide-values'
import { nextBusinessDay } from '@/lib/business-days'
import { daysBetween } from '@/lib/late-fee'
import { addMonths, formatDate, todayIso, walletLabel } from '@/lib/utils'

// Avisa no Início quando uma fatura dos meus cartões, ainda com saldo, está perto de vencer ou vencida.
// Vencida (o próximo dia útil depois do vencimento já passou): vermelho. Vence em até 3 dias: amarelo.
const SOON_DAYS = 3

type Due = { invoice: OwnInvoice; left: number; days: number }

function dueOf(list: OwnInvoice[], today: string): Due[] {
  return list.flatMap(i => {
    const left = i.amount - i.paidAmount
    if (i.paid || left <= 0) return []
    const days = daysBetween(today, nextBusinessDay(i.inv.dueDate))
    return days <= SOON_DAYS ? [{ invoice: i, left, days }] : []
  })
}

function when(days: number) {
  if (days < 0) return 'vencida'
  if (days === 0) return 'vence hoje'
  if (days === 1) return 'vence amanhã'
  return `vence em ${days} dias`
}

// Demonstração só nas prévias (fora do endereço de produção): ?demo=avisos mostra um aviso amarelo e um vermelho de exemplo.
const PRODUCTION_HOST = 'troco-finance.vercel.app'
const DEMO: { title: string; detail: string; days: number }[] = [
  { title: 'Fatura Nubank 7104 vence em 2 dias', detail: 'R$ 1.234,56 a pagar', days: 2 },
  { title: 'Fatura Santander 0514 vencida', detail: 'R$ 389,90 · venceu 20/11', days: -5 },
]

export function CardDueAlerts({ month }: { month: string }) {
  const router = useRouter()
  const demo = useSearchParams().get('demo') === 'avisos'
    && typeof window !== 'undefined' && window.location.hostname !== PRODUCTION_HOST
  const { hidden } = useHideValues()
  // faturas que vencem no mês anterior (podem estar vencidas), no atual e no seguinte (vencimento nos primeiros dias)
  const prev = useCardInvoices(addMonths(month, -1)).mine
  const curr = useCardInvoices(month).mine
  const next = useCardInvoices(addMonths(month, 1)).mine
  const today = todayIso()
  const seen = new Set<string>()
  const alerts = dueOf([...prev, ...curr, ...next], today)
    .filter(d => {
      const key = `${d.invoice.wallet.id}:${d.invoice.inv.ref}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => a.days - b.days)

  if (demo) return (
    <>
      {DEMO.map(d => (
        <AlertCard key={d.title} tone={d.days < 0 ? 'danger' : 'warning'} icon={CardLinearIcon}
          onClick={() => router.push('/cards')} title={d.title} subtitle={d.detail} />
      ))}
    </>
  )
  if (!alerts.length) return null
  return (
    <>
      {alerts.map(({ invoice: i, left, days }) => (
        <AlertCard key={`${i.wallet.id}:${i.inv.ref}`}
          tone={days < 0 ? 'danger' : 'warning'}
          icon={CardLinearIcon}
          onClick={() => router.push(`/cards/${i.wallet.id}?fatura=${i.inv.ref}`)}
          title={`Fatura ${walletLabel(i.wallet)} ${when(days)}`}
          subtitle={<>
            <Money size="inherit" tone="inherit" cents={left} mask={hidden ? HIDDEN_MONEY : undefined} />
            {days < 0 ? ` · venceu ${formatDate(i.inv.dueDate).slice(0, 5)}` : ' a pagar'}
          </>} />
      ))}
    </>
  )
}
