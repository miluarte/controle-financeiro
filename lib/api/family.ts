import type { CardDebt, Family, FamilyMember, Settlement } from '../types'
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
      isGuest: !!r.is_guest,
    })),

  // pessoa que usa o cartão mas não tem o app
  addGuest: async (name: string) => unwrap(await supabase.rpc('add_family_guest', { p_name: name })) as string,

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
      reported: Number(r.reported ?? 0),
      reportedPaidOn: (r.reported_paid_on as string | null) ?? null,
    })),

  // 5.7.8: acertos de um cartão (o RLS mostra só os meus, como devedor ou titular).
  settlements: async (walletId: string): Promise<Settlement[]> => {
    const rows = unwrap(await supabase.from('settlements').select('*').eq('wallet_id', walletId).order('created_at', { ascending: false }))
    return rows.map(r => ({
      id: r.id, walletId: r.wallet_id, debtorId: r.debtor_id, holderId: r.holder_id,
      invoiceRef: r.invoice_ref, amount: Number(r.amount), status: r.status,
      reportedAt: r.reported_at, confirmedAt: r.confirmed_at, paidOn: r.paid_on ?? null,
    }))
  },

  reportSettlement: async (walletId: string, invoiceRef: string, amount: number, fromWalletId: string, date: string) => {
    unwrap(await supabase.rpc('report_settlement', {
      p_wallet: walletId, p_invoice_ref: invoiceRef, p_amount: amount, p_from_wallet: fromWalletId, p_date: date,
    }))
  },
  confirmSettlement: async (id: string, toWalletId: string) => {
    unwrap(await supabase.rpc('confirm_settlement', { p_settlement: id, p_to_wallet: toWalletId }))
  },
  rejectSettlement: async (id: string) => { unwrap(await supabase.rpc('reject_settlement', { p_settlement: id })) },
  cancelSettlement: async (id: string) => { unwrap(await supabase.rpc('cancel_settlement', { p_settlement: id })) },

  // ATR-5: dividir compra à vista entre pessoas (partes somando o valor total).
  // Vale para compra à vista ou parcelada (cada parcela em aberto na mesma proporção). Itens com owner
  // ficam com a pessoa; owner 'split' vai para todos.
  splitPurchase: async (transactionId: string, parts: { userId: string; amount: number }[], items?: { name: string; amount: number; owner?: string }[]) => {
    unwrap(await supabase.rpc('split_purchase', {
      p_transaction: transactionId,
      p_parts: parts.map(p => ({ user_id: p.userId, amount: p.amount })),
      ...(items?.length ? { p_items: items } : {}),
    }))
  },
}
