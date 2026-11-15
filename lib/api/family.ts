import type { CardDebt, Family, FamilyMember } from '../types'
import { supabase, unwrap } from '../supabase/client'

// 5.7: família e cartões compartilhados. Escritas sensíveis passam pelas RPCs do banco.
export const familyApi = {
  // Família de que participo (ativa ou com entrada pendente) e meu vínculo.
  mine: async (): Promise<{ family: Family | null; status: 'pending' | 'active' | null; role: 'admin' | 'member' | null }> => {
    const { data: auth } = await supabase.auth.getSession()
    const uid = auth.session?.user.id
    if (!uid) return { family: null, status: null, role: null }
    // filtra por mim: o RLS também devolve as linhas dos outros membros da família
    const { data: m } = await supabase.from('family_members').select('family_id, status, role').eq('user_id', uid).maybeSingle()
    if (!m) return { family: null, status: null, role: null }
    const { data: f } = await supabase.from('families').select('*').eq('id', m.family_id).maybeSingle()
    return {
      family: f ? { id: f.id, name: f.name, code: f.code, entriesPaused: !!f.entries_paused } : null,
      status: m.status,
      role: m.role,
    }
  },

  members: async (): Promise<FamilyMember[]> =>
    unwrap(await supabase.rpc('family_members_list')).map((r: Record<string, unknown>) => ({
      userId: r.user_id as string,
      name: (r.name as string) || 'Sem nome',
      avatarColor: (r.avatar_color as string) || 'gray',
      role: r.role as FamilyMember['role'],
      status: r.status as FamilyMember['status'],
      joinedAt: (r.joined_at as string) ?? null,
    })),

  create: async (name: string) => { unwrap(await supabase.rpc('create_family', { p_name: name })) },
  join: async (code: string) => { unwrap(await supabase.rpc('join_family', { p_code: code })) },
  leave: async () => { unwrap(await supabase.rpc('leave_family')) },
  rename: async (name: string) => { unwrap(await supabase.rpc('rename_family', { p_name: name })) },
  regenerateCode: async () => unwrap(await supabase.rpc('regenerate_family_code')) as string,
  setPaused: async (paused: boolean) => { unwrap(await supabase.rpc('set_family_entries_paused', { p_paused: paused })) },
  approve: async (userId: string) => { unwrap(await supabase.rpc('approve_family_member', { p_user: userId })) },
  remove: async (userId: string) => { unwrap(await supabase.rpc('remove_family_member', { p_user: userId })) },

  // CCO-1: compartilhar cartão com ninguém, a família toda ou membros escolhidos.
  setCardSharing: async (walletId: string, scope: 'none' | 'family' | 'selected', userIds: string[]) => {
    unwrap(await supabase.from('wallets').update({ share_scope: scope }).eq('id', walletId))
    unwrap(await supabase.from('wallet_shares').delete().eq('wallet_id', walletId))
    if (scope === 'selected' && userIds.length) {
      unwrap(await supabase.from('wallet_shares').insert(userIds.map(u => ({ wallet_id: walletId, user_id: u }))))
    }
  },

  cardShares: async (walletId: string) => {
    const rows = unwrap(await supabase.from('wallet_shares').select('user_id').eq('wallet_id', walletId))
    return rows.map(r => r.user_id as string)
  },

  // ATR-2 e ATR-4: "De quem é essa compra?" (vale para todas as parcelas em aberto).
  assignPurchase: async (transactionId: string, userId: string) => {
    unwrap(await supabase.rpc('assign_purchase', { p_transaction: transactionId, p_user: userId }))
  },

  // VIS-1 e 7.7: quanto eu devo a cada titular, por fatura.
  myDebts: async (): Promise<CardDebt[]> =>
    unwrap(await supabase.rpc('my_card_debts')).map((r: Record<string, unknown>) => ({
      walletId: r.wallet_id as string,
      invoiceRef: r.invoice_ref as string,
      dueDate: r.due_date as string,
      total: Number(r.total),
      settled: Number(r.settled),
      open: Number(r.open),
    })),
}
