'use client'

import { useMemo } from 'react'
import useSWR from 'swr'
import { useOwnWallets } from '@/hooks/use-data'
import { invoicesApi } from '@/lib/api/invoices'
import { transactionsApi } from '@/lib/api/transactions'
import { invoiceRefDueIn } from '@/lib/invoice'
import type { Transaction } from '@/lib/types'
import { addMonths } from '@/lib/utils'

// Meses mostrados no gráfico: 3 antes e 3 depois do mês escolhido.
const SPAN = 3

// Gasto de todos os meus cartões de crédito, somados, pela fatura que vence em cada mês.
// months: total de cada mês do gráfico. purchases: as compras de todas as faturas do mês escolhido,
// da mais recente para a mais antiga; compra dividida vira uma linha só (soma das partes).
export function useCardStatement(month: string) {
  const { wallets: own, loading: loadingWallets } = useOwnWallets()
  const cards = useMemo(() => own.filter(w => w.type === 'credit' && w.active), [own])
  const range = useMemo(() => Array.from({ length: SPAN * 2 + 1 }, (_, i) => addMonths(month, i - SPAN)), [month])
  const ids = cards.map(w => w.id).join(',')

  const from = `${addMonths(range[0], -1)}-01`
  const to = `${range[range.length - 1]}-01`
  const { data: totals } = useSWR(ids ? ['card-statement-totals', ids, from, to] : null,
    () => invoicesApi.totals(from, to))

  const { data: list, isLoading } = useSWR(ids ? ['card-statement', ids, month] : null, async () => {
    const parts = await Promise.all(cards.map(w => transactionsApi.getByInvoice(w.id, `${invoiceRefDueIn(w, month)}-01`)))
    return parts.flat()
  })

  return useMemo(() => {
    const months = range.map(m => ({
      month: m,
      total: cards.reduce((s, w) => {
        const ref = invoiceRefDueIn(w, m)
        return s + (totals ?? []).filter(t => t.walletId === w.id && t.invoiceRef.slice(0, 7) === ref).reduce((x, t) => x + t.total, 0)
      }, 0),
    }))

    // compra dividida: uma linha (a parte original, com a soma das partes)
    const groups = new Map<string, Transaction[]>()
    for (const t of list ?? []) {
      const key = typeof t.sourceData?.split_of === 'string' ? t.sourceData.split_of : t.id
      groups.set(key, [...(groups.get(key) ?? []), t])
    }
    // compra dividida: id da linha → donos das partes
    const merged = new Map<string, string[]>()
    const purchases = [...groups].map(([key, parts]) => {
      const main = parts.find(p => p.id === key) ?? parts[0]
      if (parts.length === 1) return main
      merged.set(main.id, parts.map(p => p.owner))
      return { ...main, amount: parts.reduce((s, p) => s + p.amount, 0) }
    }).sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))

    const total = (list ?? []).reduce((s, t) => s + t.amount, 0)
    return { months, purchases, merged, total, hasCards: cards.length > 0, loading: loadingWallets || isLoading }
  }, [range, cards, totals, list, loadingWallets, isLoading])
}
