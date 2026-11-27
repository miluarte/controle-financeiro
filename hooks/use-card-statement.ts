'use client'

import { useMemo } from 'react'
import useSWR from 'swr'
import { useSession } from '@/hooks/use-session'
import { useWallets } from '@/hooks/use-wallets'
import { transactionsApi } from '@/lib/api/transactions'
import { invoiceDueMonth } from '@/lib/invoice'
import { addMonths } from '@/lib/utils'

// Meses mostrados no gráfico: 3 antes e 3 depois do mês escolhido.
const SPAN = 3

// Meus gastos em todos os cartões de crédito (os meus e os da família), pela fatura que vence em cada mês.
// months: total de cada mês do gráfico. purchases: as compras das faturas que vencem no mês escolhido,
// da mais recente para a mais antiga. Só as compras no meu nome: no cartão de outra pessoa, só a minha parte.
export function useCardStatement(month: string) {
  const { session } = useSession()
  const me = session?.user.id
  const { wallets, loading: loadingWallets } = useWallets()
  const range = useMemo(() => Array.from({ length: SPAN * 2 + 1 }, (_, i) => addMonths(month, i - SPAN)), [month])

  // a fatura que vence num mês é a do próprio mês ou a do anterior, conforme o fechamento do cartão
  const from = `${addMonths(range[0], -1)}-01`
  const to = `${range[range.length - 1]}-01`
  const { data: list, isLoading } = useSWR(me ? ['card-statement', me, from, to] : null,
    () => transactionsApi.getMyCardPurchases(me!, from, to))

  return useMemo(() => {
    const walletById = new Map(wallets.map(w => [w.id, w]))
    // mês em que vence a fatura de cada compra (cartão fora da lista: vence no mês seguinte ao da fatura)
    const dueOf = (walletId: string | null, ref: string) => {
      const w = walletId ? walletById.get(walletId) : undefined
      return w ? invoiceDueMonth(w, ref) : addMonths(ref, 1)
    }
    const withDue = (list ?? []).map(t => ({ t, due: dueOf(t.walletId, (t.invoiceRef ?? '').slice(0, 7)) }))

    const months = range.map(m => ({
      month: m,
      total: withDue.filter(x => x.due === m).reduce((s, x) => s + x.t.amount, 0),
    }))
    const purchases = withDue.filter(x => x.due === month).map(x => x.t)
      .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    const total = purchases.reduce((s, t) => s + t.amount, 0)
    const hasCards = wallets.some(w => w.type === 'credit')
    return { months, purchases, total, hasCards, loading: loadingWallets || isLoading }
  }, [range, month, wallets, list, loadingWallets, isLoading])
}
