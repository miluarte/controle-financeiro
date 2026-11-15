import type { NewTransaction } from '../types'
import { supabase, unwrap } from '../supabase/client'
import { toTransaction } from '../supabase/mappers'
import { monthRange } from '../utils'

export const transactionsApi = {
  // Lançamentos do mês que são meus (atribuídos a mim). O titular de um cartão
  // compartilhado também recebe as compras de membros pelo RLS; aqui elas ficam de fora.
  getByMonth: async (month: string, userId: string) => {
    const { start, endExclusive } = monthRange(month)
    const rows = unwrap(
      await supabase.from('transactions').select('*')
        .eq('assigned_to', userId).eq('status', 'confirmed')
        .gte('date', start).lt('date', endExclusive)
        .order('date', { ascending: false }).order('created_at', { ascending: false }),
    )
    return rows.map(toTransaction)
  },

  create: async (t: NewTransaction) => {
    const row = unwrap(
      await supabase.from('transactions').insert({
        type: t.type,
        amount: t.amount,
        date: t.date,
        category_id: t.categoryId,
        wallet_id: t.walletId,
        place: t.place,
        description: t.description,
      }).select('*').single(),
    )
    return toTransaction(row)
  },

  createInstallments: async (args: {
    walletId: string; categoryId: string | null; total: number; installments: number
    firstDate: string; place: string | null
  }) => {
    unwrap(await supabase.rpc('create_installment_purchase', {
      p_wallet: args.walletId,
      p_category: args.categoryId,
      p_total: args.total,
      p_installments: args.installments,
      p_first_date: args.firstDate,
      p_place: args.place,
    }))
  },

  remove: async (id: string) => {
    unwrap(await supabase.from('transactions').delete().eq('id', id))
  },
}
