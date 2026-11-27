'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { CardLinearIcon } from '@solar-icons/react'
import { AlertCard } from '@/components/shared/alert-card'
import { useCardInvoices, type OwnInvoice } from '@/hooks/use-card-invoices'
import { nextBusinessDay } from '@/lib/business-days'
import { daysBetween } from '@/lib/late-fee'
import { addMonths, todayIso } from '@/lib/utils'

// Avisa no Início quando uma fatura dos meus cartões, ainda com saldo, está perto de vencer ou vencida.
// Vencida (o próximo dia útil depois do vencimento já passou): vermelho. Vence em até 3 dias: amarelo.
const SOON_DAYS = 3

type Due = { invoice: OwnInvoice; days: number }

function dueOf(list: OwnInvoice[], today: string): Due[] {
  return list.flatMap(i => {
    const left = i.amount - i.paidAmount
    if (i.paid || left <= 0) return []
    const days = daysBetween(today, nextBusinessDay(i.inv.dueDate))
    return days <= SOON_DAYS ? [{ invoice: i, days }] : []
  })
}

// Um aviso só, resumindo as faturas: "1 fatura vencida e 1 a vencer". Vermelho se alguma venceu.
// Demonstração só nas prévias (fora do endereço de produção): ?demo=avisos mostra 1 vencida e 1 a vencer.
const PRODUCTION_HOST = 'troco-finance.vercel.app'

const faturas = (n: number) => `${n} ${n === 1 ? 'fatura' : 'faturas'}`

function summary(overdue: number, soon: number) {
  if (overdue && soon) return `${faturas(overdue)} ${overdue === 1 ? 'vencida' : 'vencidas'} e ${soon} a vencer`
  if (overdue) return `${faturas(overdue)} ${overdue === 1 ? 'vencida' : 'vencidas'}`
  return `${faturas(soon)} a vencer`
}

export function CardDueAlerts({ month }: { month: string }) {
  const router = useRouter()
  const demo = useSearchParams().get('demo') === 'avisos'
    && typeof window !== 'undefined' && window.location.hostname !== PRODUCTION_HOST
  // faturas que vencem no mês anterior (podem estar vencidas), no atual e no seguinte (vencimento nos primeiros dias)
  const prev = useCardInvoices(addMonths(month, -1)).mine
  const curr = useCardInvoices(month).mine
  const next = useCardInvoices(addMonths(month, 1)).mine
  const today = todayIso()
  const seen = new Set<string>()
  const alerts = dueOf([...prev, ...curr, ...next], today).filter(d => {
    const key = `${d.invoice.wallet.id}:${d.invoice.inv.ref}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const overdue = demo ? 1 : alerts.filter(a => a.days < 0).length
  const soon = demo ? 1 : alerts.length - overdue
  if (!overdue && !soon) return null

  // uma fatura só: abre a própria fatura; mais de uma: abre a aba Cartões
  const only = !demo && alerts.length === 1 ? alerts[0].invoice : null
  return (
    <AlertCard tone={overdue ? 'danger' : 'warning'} icon={CardLinearIcon}
      onClick={() => router.push(only ? `/cards/${only.wallet.id}?fatura=${only.inv.ref}` : '/cards')}
      title={summary(overdue, soon)}
      subtitle="Confira e registre o pagamento" />
  )
}
