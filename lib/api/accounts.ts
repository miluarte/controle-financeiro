import type { Account } from '../types'
import { supabase, unwrap } from '../supabase/client'
import { fromAccount, toAccount } from '../supabase/mappers'

async function getOne(id: string): Promise<Account> {
  const row = unwrap(await supabase.from('accounts_with_balance').select('*').eq('id', id).single())
  return toAccount(row)
}

export const accountsApi = {
  getAll: async () => {
    const rows = unwrap(await supabase.from('accounts_with_balance').select('*').order('created_at'))
    return rows.map(toAccount)
  },

  create: async (data: Omit<Account, 'id' | 'createdAt' | 'currentBalance' | 'availableCredit'>) => {
    const row = unwrap(await supabase.from('accounts').insert(fromAccount(data)).select('id').single())
    return getOne(row.id)
  },

  update: async (data: Partial<Account> & { id: string }) => {
    const { id, ...rest } = data
    // Saldo inicial só é definido na criação.
    const patch = fromAccount({ ...rest, initialBalance: undefined })
    unwrap(await supabase.from('accounts').update(patch).eq('id', id).select('id').single())
    return getOne(id)
  },

  archive: async (id: string) => {
    unwrap(await supabase.from('accounts').update({ archived: true }).eq('id', id).select('id').single())
    return getOne(id)
  },
}
