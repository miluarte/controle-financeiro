'use client'

import { useCallback } from 'react'
import useSWR from 'swr'
import { transactionsApi } from '@/lib/api/transactions'
import { useInvoices, useOwnWallets } from '@/hooks/use-data'
import { useMyDebts } from '@/hooks/use-family'
import { useWallets } from '@/hooks/use-wallets'
import { openInvoiceRef } from '@/lib/invoice'
import type { BillOccurrence } from '@/lib/types'

// Gasto fixo cobrado no cartão: conta como pago quando a própria cobrança foi antecipada
// ou quando a fatura em que ela entrou está paga.
// No cartão de outra pessoa da família, quando o que eu devo nessa fatura já foi acertado.
export function useCardChargePaid(month: string, occurrences: BillOccurrence[]) {
  const ids = occurrences.map(o => o.transactionId).filter((x): x is string => !!x)
  const { data: charges } = useSWR(ids.length ? ['card-charges', ids.join(',')] : null, () => transactionsApi.getByIds(ids))
  const { wallets: own } = useOwnWallets()
  const { wallets: usable } = useWallets()
  const { totals, paid, paidAmounts } = useInvoices(month)
  const debts = useMyDebts()

  return useCallback((o: BillOccurrence) => {
    const id = o.bill.walletId
    const mine = own.find(w => w.id === id)
    const card = mine ?? usable.find(w => w.id === id)
    if (!card) return false
    const charge = charges?.find(t => t.id === o.transactionId)
    if (charge?.prepaidBy) return true
    const ref = charge?.invoiceRef?.slice(0, 7)
      ?? openInvoiceRef({ closingDay: card.closingDay, closingDayInclusive: mine?.closingDayInclusive ?? false }, o.dueDate)
    if (!mine) {
      const debt = debts.find(d => d.walletId === id && d.invoiceRef.slice(0, 7) === ref)
      return !!debt && debt.open <= 0
    }
    if (paid.some(p => p.walletId === id && p.refMonth.slice(0, 7) === ref && p.paidAt)) return true
    const total = totals.filter(t => t.walletId === id && t.invoiceRef.slice(0, 7) === ref)
      .reduce((s, t) => s + t.total - t.prepaid, 0)
    const paidAmount = paidAmounts.find(p => p.walletId === id && p.invoiceRef === ref)?.paid ?? 0
    return total > 0 && paidAmount >= total
  }, [own, usable, totals, paid, paidAmounts, debts, charges])
}
