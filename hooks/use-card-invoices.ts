'use client'

import { useMemo } from 'react'
import useSWR from 'swr'
import type { InvoiceRef } from '@/components/bills/invoice-sheet'
import { useInvoices, useOwnWallets } from '@/hooks/use-data'
import { useFamily, useFamilyMembers, useMyDebts, useSharedDebts } from '@/hooks/use-family'
import { useSession } from '@/hooks/use-session'
import { useWallets } from '@/hooks/use-wallets'
import { familyApi } from '@/lib/api/family'
import { invoiceDueDate, invoiceRefDueIn } from '@/lib/invoice'
import type { CardDebt, OwnWallet, Settlement, SharedDebt, Wallet } from '@/lib/types'

// Fatura de um cartão meu que vence no mês. amount = a pagar; paidAmount = já pago (pagamento parcial).
export interface OwnInvoice { wallet: OwnWallet; inv: InvoiceRef; amount: number; paidAmount: number; paid: boolean }

// Fatura de um cartão com outra pessoa: o que eu devo a ela (owe) ou o que ela me deve (receive).
export interface PersonInvoice { wallet: Wallet | OwnWallet; debt: CardDebt }

export interface PersonGroup {
  id: string
  name: string
  color: string
  invoices: PersonInvoice[]
  // Pix divididos com a pessoa (ela pagou e eu devo, ou eu paguei e ela me deve)
  pix: SharedDebt[]
  total: number
  open: number
  reported: number
}

// vence no mês escolhido, ou venceu antes e ainda tem saldo
const inMonth = (d: CardDebt, month: string) => {
  const due = d.dueDate.slice(0, 7)
  return due === month || (due < month && d.open > 0)
}

// Pix do mês escolhido, ou de antes e ainda com saldo
const pixInMonth = (d: SharedDebt, month: string) => {
  const m = d.date.slice(0, 7)
  return m === month || (m < month && d.open > 0)
}

type Entry = { personId: string; name: string; color: string } & ({ inv: PersonInvoice } | { pix: SharedDebt })

function group(list: Entry[]): PersonGroup[] {
  const map = new Map<string, PersonGroup>()
  for (const e of list) {
    const g = map.get(e.personId) ?? { id: e.personId, name: e.name, color: e.color, invoices: [], pix: [], total: 0, open: 0, reported: 0 }
    const d = 'inv' in e ? e.inv.debt : e.pix
    if ('inv' in e) g.invoices.push(e.inv)
    else g.pix.push(e.pix)
    g.total += 'inv' in e ? e.inv.debt.total : e.pix.part
    g.open += d.open
    g.reported += Math.min(d.reported, d.open)
    map.set(e.personId, g)
  }
  for (const g of map.values()) {
    g.invoices.sort((a, b) => a.debt.dueDate.localeCompare(b.debt.dueDate))
    g.pix.sort((a, b) => a.date.localeCompare(b.date))
  }
  return [...map.values()].sort((a, b) => b.open - a.open || a.name.localeCompare(b.name))
}

// Faturas do mês para a aba Cartões: as dos meus cartões (por cartão) e as dos cartões compartilhados (por pessoa).
export function useCardInvoices(month: string) {
  const { session } = useSession()
  const me = session?.user.id
  const { wallets: own, loading: loadingWallets } = useOwnWallets()
  const { wallets: usable } = useWallets()
  const { totals, paid: paidInvoices, paidAmounts, loading: loadingInvoices } = useInvoices(month)
  const debts = useMyDebts()
  const shared = useSharedDebts()
  const { family, status } = useFamily()
  const members = useFamilyMembers(!!family && status === 'active')
  const credit = useMemo(() => own.filter(w => w.type === 'credit' && w.active), [own])
  const ids = credit.map(w => w.id)
  const { data: rec } = useSWR(me && ids.length ? ['receivables', me, ids.join(',')] : null,
    () => familyApi.receivables(me!, ids))

  return useMemo(() => {
    const colorOf = (id: string) => members.find(m => m.userId === id)?.avatarColor ?? 'gray'
    const nameOf = (id: string) => members.find(m => m.userId === id)?.name ?? 'Membro'

    // meus cartões: a fatura que vence no mês (cartão sem fatura no mês também aparece, zerado)
    const mine: OwnInvoice[] = credit.map(w => {
      const ref = invoiceRefDueIn(w, month)
      const rows = totals.filter(t => t.walletId === w.id && t.invoiceRef.slice(0, 7) === ref)
      // o que já foi pago antes (compras antecipadas) sai do valor a pagar
      const total = rows.reduce((s, t) => s + t.total - t.prepaid, 0)
      const prepaid = rows.reduce((s, t) => s + t.prepaid, 0)
      const paidAt = paidInvoices.find(p => p.walletId === w.id && p.refMonth.slice(0, 7) === ref)?.paidAt ?? null
      const due = invoiceDueDate(w, ref)
      const paidAmount = Math.min(paidAmounts.find(p => p.walletId === w.id && p.invoiceRef === ref)?.paid ?? 0, total)
      const paid = !!paidAt || (total > 0 && total - paidAmount <= 0)
      return { wallet: w, amount: total, paidAmount: paid ? total : paidAmount, paid,
        inv: { wallet: w, ref, dueDate: due, total, prepaid, paidAt, paidAmount } }
    }).sort((a, b) => a.inv.dueDate.localeCompare(b.inv.dueDate))

    // o que eu devo nos cartões de outras pessoas, por titular, e nos Pix que elas pagaram
    const owe = group([
      ...debts.filter(d => inMonth(d, month)).flatMap((d): Entry[] => {
        const w = usable.find(x => x.id === d.walletId && x.ownerName)
        if (!w?.ownerId) return []
        return [{ personId: w.ownerId, name: w.ownerName ?? 'Titular', color: colorOf(w.ownerId), inv: { wallet: w, debt: d } }]
      }),
      ...shared.filter(d => d.debtorId === me && d.payerId !== me && pixInMonth(d, month))
        .map((d): Entry => ({ personId: d.payerId, name: nameOf(d.payerId), color: colorOf(d.payerId), pix: d })),
    ])

    // o que outras pessoas me devem nos meus cartões, por pessoa (acerto confirmado abate da própria fatura)
    const settlements: Settlement[] = rec?.settlements ?? []
    const receive = group([...(rec?.totals ?? []).flatMap((t): Entry[] => {
      const w = credit.find(x => x.id === t.walletId)
      if (!w) return []
      const of = settlements.filter(s => s.walletId === t.walletId && s.invoiceRef === t.invoiceRef && s.debtorId === t.assignedTo)
      const settled = of.filter(s => s.status === 'confirmed').reduce((s, x) => s + x.amount, 0)
      const reportedList = of.filter(s => s.status === 'reported')
      const debt: CardDebt = {
        walletId: t.walletId, invoiceRef: t.invoiceRef, dueDate: invoiceDueDate(w, t.invoiceRef.slice(0, 7)),
        total: t.total, settled, open: Math.max(t.total - settled, 0),
        reported: reportedList.reduce((s, x) => s + x.amount, 0), reportedPaidOn: reportedList[0]?.paidOn ?? null,
      }
      if (debt.total <= 0 || !inMonth(debt, month)) return []
      return [{ personId: t.assignedTo, name: nameOf(t.assignedTo), color: colorOf(t.assignedTo), inv: { wallet: w, debt } }]
    }),
    // Pix que eu paguei e outras pessoas me devem
    ...shared.filter(d => d.payerId === me && d.debtorId !== me && pixInMonth(d, month))
      .map((d): Entry => ({ personId: d.debtorId, name: nameOf(d.debtorId), color: colorOf(d.debtorId), pix: d })),
    ])

    const toPay = mine.reduce((s, i) => s + (i.paid ? 0 : i.amount - i.paidAmount), 0) + owe.reduce((s, g) => s + g.open, 0)
    const toReceive = receive.reduce((s, g) => s + g.open, 0)
    return { mine, owe, receive, settlements, toPay, toReceive, loading: loadingWallets || loadingInvoices }
  }, [credit, month, totals, paidInvoices, paidAmounts, debts, shared, me, usable, members, rec, loadingWallets, loadingInvoices])
}
