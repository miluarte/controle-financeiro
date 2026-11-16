import type { OwnWallet, Wallet, WalletInput } from '../types'
import { supabase, unwrap } from '../supabase/client'
import { toInstitution, toOwnWallet, toWallet } from '../supabase/mappers'

function toRow(w: Partial<WalletInput>) {
  const r: Record<string, unknown> = {}
  if (w.name !== undefined) r.name = w.name
  if (w.type !== undefined) r.type = w.type
  if (w.finish !== undefined) r.finish = w.finish
  if (w.closingDay !== undefined) r.closing_day = w.closingDay
  if (w.dueDay !== undefined) r.due_day = w.dueDay
  if (w.spendingLimit !== undefined) r.spending_limit = w.spendingLimit
  if (w.institutionId !== undefined) r.institution_id = w.institutionId
  if (w.last4 !== undefined) r.last4 = w.last4
  if (w.revolvingRate !== undefined) r.revolving_rate = w.revolvingRate
  return r
}

export const institutionsApi = {
  list: async () => unwrap(await supabase.from('institutions').select('*').order('name')).map(toInstitution),
}

export const walletsApi = {
  // Minhas carteiras ativas + cartões compartilhados comigo pela família.
  getAll: async (): Promise<Wallet[]> => {
    const [own, shared] = await Promise.all([
      supabase.from('wallets').select('*').eq('active', true).order('sort_order').order('created_at'),
      supabase.rpc('shared_wallets'),
    ])
    return [...unwrap(own).map(toWallet), ...unwrap(shared).map(toWallet)]
  },

  // Só as minhas, inclusive arquivadas (tela de carteiras).
  getOwn: async (): Promise<OwnWallet[]> => {
    const rows = unwrap(await supabase.from('wallets').select('*').order('sort_order').order('created_at'))
    return rows.map(toOwnWallet)
  },

  create: async (w: WalletInput) =>
    toOwnWallet(unwrap(await supabase.from('wallets').insert(toRow(w)).select('*').single())),

  update: async (id: string, w: Partial<WalletInput>) =>
    toOwnWallet(unwrap(await supabase.from('wallets').update(toRow(w)).eq('id', id).select('*').single())),

  setActive: async (id: string, active: boolean) => {
    unwrap(await supabase.from('wallets').update({ active }).eq('id', id))
  },

  // CAR-7: o banco só deixa excluir carteira sem lançamentos.
  remove: async (id: string) => {
    const { count } = await supabase.from('wallets').delete({ count: 'exact' }).eq('id', id)
    if (!count) throw new Error('Esta carteira tem lançamentos. Arquive em vez de excluir.')
  },
}
