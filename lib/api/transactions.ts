import type { Transaction } from '../types'
import { supabase, unwrap } from '../supabase/client'
import { fromTransaction, toTransaction } from '../supabase/mappers'

function monthRange(month: string) {
  const [y, m] = month.split('-').map(Number)
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
  return { start: `${month}-01`, endExclusive: `${next}-01` }
}

export const transactionsApi = {
  getAll: async () => {
    const rows = unwrap(await supabase.from('transactions').select('*').order('date', { ascending: false }))
    return rows.map(toTransaction)
  },

  getByMonth: async (month: string) => {
    const { start, endExclusive } = monthRange(month)
    const rows = unwrap(
      await supabase.from('transactions').select('*')
        .gte('date', start).lt('date', endExclusive)
        .order('date', { ascending: false }),
    )
    return rows.map(toTransaction)
  },

  getByAccount: async (accountId: string, startDate: string, endDate: string) => {
    const rows = unwrap(
      await supabase.from('transactions').select('*')
        .or(`account_id.eq.${accountId},to_account_id.eq.${accountId}`)
        .gte('date', startDate).lte('date', endDate)
        .order('date', { ascending: false }),
    )
    return rows.map(toTransaction)
  },

  create: async (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    const row = unwrap(await supabase.from('transactions').insert(fromTransaction(data)).select('*').single())
    return toTransaction(row)
  },

  update: async (data: Partial<Transaction> & { id: string }) => {
    const { id, ...rest } = data
    const row = unwrap(
      await supabase.from('transactions').update(fromTransaction(rest)).eq('id', id).select('*').single(),
    )
    return toTransaction(row)
  },

  delete: async (id: string) => {
    unwrap(await supabase.from('transactions').delete().eq('id', id))
    return { id }
  },
}
