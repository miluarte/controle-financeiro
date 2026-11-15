import type { Wallet } from '../types'
import { supabase, unwrap } from '../supabase/client'
import { toWallet } from '../supabase/mappers'

export const walletsApi = {
  // Minhas carteiras ativas + cartões compartilhados comigo pela família.
  getAll: async (): Promise<Wallet[]> => {
    const [own, shared] = await Promise.all([
      supabase.from('wallets').select('*').eq('active', true).order('sort_order').order('created_at'),
      supabase.rpc('shared_wallets'),
    ])
    return [...unwrap(own).map(toWallet), ...unwrap(shared).map(toWallet)]
  },
}
