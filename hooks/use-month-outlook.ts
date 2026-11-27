'use client'

import { useMemo } from 'react'
import { useCardInvoices } from '@/hooks/use-card-invoices'
import { useBills } from '@/hooks/use-data'
import { useMonthSummary } from '@/hooks/use-month-summary'
import { nextBusinessDay } from '@/lib/business-days'
import type { BillOccurrence } from '@/lib/types'

// Uma coisa que ainda falta pagar no mês: conta fixa, fatura de cartão meu ou repasse para alguém da família.
export type ToPayItem =
  | { kind: 'bill'; id: string; title: string; dueDate: string; amount: number; occurrence: BillOccurrence }
  | { kind: 'invoice'; id: string; title: string; dueDate: string; amount: number; href: string }
  | { kind: 'person'; id: string; title: string; dueDate: string; amount: number; href: string }

// Quanto sobra no mês: o saldo de hoje, mais o que ainda vai entrar (receitas fixas e o que a família
// me deve), menos o que ainda vence (contas fixas, faturas dos meus cartões e repasses).
export function useMonthOutlook(month: string) {
  const { summary, loading: loadingSummary } = useMonthSummary(month)
  const { occurrences, loading: loadingBills } = useBills(month)
  const cards = useCardInvoices(month)

  return useMemo(() => {
    const bills: ToPayItem[] = occurrences
      .filter(o => o.bill.type === 'expense' && !o.bill.onCard && !o.paidAt)
      .map(o => ({ kind: 'bill', id: `bill-${o.id}`, title: o.bill.name, dueDate: o.dueDate, amount: o.amount, occurrence: o }))
    const invoices: ToPayItem[] = cards.mine
      .filter(i => !i.paid && i.amount - i.paidAmount > 0)
      .map(i => ({
        kind: 'invoice', id: `inv-${i.wallet.id}`, title: `Fatura ${i.wallet.name}`,
        dueDate: nextBusinessDay(i.inv.dueDate), amount: i.amount - i.paidAmount,
        href: `/cards/${i.wallet.id}?fatura=${i.inv.ref}`,
      }))
    // acerto já informado saiu do saldo: só entra o que falta informar
    const people: ToPayItem[] = cards.owe
      .filter(g => g.open - g.reported > 0)
      .map(g => {
        const due = [...g.invoices.filter(i => i.debt.open > 0).map(i => i.debt.dueDate), ...g.pix.filter(p => p.open > 0).map(p => p.date)].sort()[0]
        return { kind: 'person', id: `person-${g.id}`, title: `Repassar para ${g.name}`, dueDate: due ?? `${month}-01`, amount: g.open - g.reported, href: `/cards/pessoa/${g.id}` }
      })
    const items = [...bills, ...invoices, ...people].sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    const toPay = items.reduce((s, i) => s + i.amount, 0)
    const incomes = occurrences.filter(o => o.bill.type === 'income' && !o.paidAt).reduce((s, o) => s + o.amount, 0)
    const toReceive = incomes + cards.toReceive
    const balance = summary?.balance ?? 0
    return {
      summary, items, toPay, toReceive, balance,
      leftover: balance + toReceive - toPay,
      loading: loadingSummary || loadingBills || cards.loading || !summary,
    }
  }, [summary, occurrences, cards, month, loadingSummary, loadingBills])
}
