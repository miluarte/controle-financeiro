import type { Settlement, SharedDebt, SharedPart } from '../types'
import { supabase, unwrap } from '../supabase/client'
import { toSettlement } from './family'

// Pix dividido: alguém pagou por Pix e o valor é dividido entre pessoas da família.
// Cada parte vira um gasto de quem a tem; o dinheiro sai de quem pagou. Escritas só pelas RPCs.
export const sharedApi = {
  create: async (args: {
    payerId: string; walletId: string | null; amount: number; date: string; place: string | null
    categoryId: string | null; parts: { userId: string; amount: number }[]
    source?: string; sourceData?: Record<string, unknown> | null; receiptPath?: string | null
  }): Promise<string> =>
    unwrap(await supabase.rpc('create_shared_payment', {
      p_payer: args.payerId,
      p_wallet: args.walletId,
      p_amount: args.amount,
      p_date: args.date,
      p_place: args.place,
      p_category: args.categoryId,
      p_parts: args.parts.map(p => ({ user_id: p.userId, amount: p.amount })),
      p_source: args.source ?? 'manual',
      p_source_data: args.sourceData ?? null,
      p_receipt_path: args.receiptPath ?? null,
    })) as string,

  remove: async (id: string) => { unwrap(await supabase.rpc('delete_shared_payment', { p_id: id })) },

  // Pix em que sou quem pagou ou quem deve: uma linha por pessoa que deve
  debts: async (): Promise<SharedDebt[]> =>
    unwrap(await supabase.rpc('shared_debts')).map((r: Record<string, unknown>) => ({
      sharedPaymentId: r.shared_payment_id as string,
      payerId: r.payer_id as string,
      debtorId: r.debtor_id as string,
      createdBy: (r.created_by as string | null) ?? null,
      place: (r.place as string | null) ?? null,
      date: r.date as string,
      total: Number(r.total),
      part: Number(r.part),
      settled: Number(r.settled),
      reported: Number(r.reported),
      open: Number(r.open),
      reportedPaidOn: (r.reported_paid_on as string | null) ?? null,
    })),

  parts: async (id: string): Promise<SharedPart[]> =>
    unwrap(await supabase.rpc('shared_payment_parts', { p_id: id })).map((r: Record<string, unknown>) => ({
      userId: r.user_id as string, part: Number(r.part), settled: Number(r.settled), open: Number(r.open),
    })),

  // acertos do Pix que eu vejo (como quem deve ou quem pagou)
  settlements: async (id: string): Promise<Settlement[]> =>
    unwrap(await supabase.from('settlements').select('*').eq('shared_payment_id', id).order('created_at', { ascending: false }))
      .map(toSettlement),

  // quem deve informa que pagou; quem pagou confirma (familyApi.confirmSettlement)
  report: async (id: string, amount: number, fromWalletId: string, date: string) => {
    unwrap(await supabase.rpc('report_shared_settlement', { p_shared: id, p_amount: amount, p_from_wallet: fromWalletId, p_date: date }))
  },

  // quem pagou registra o que recebeu de quem não tem o app
  receive: async (id: string, debtorId: string, amount: number, toWalletId: string, date: string) => {
    unwrap(await supabase.rpc('receive_shared_settlement', {
      p_shared: id, p_debtor: debtorId, p_amount: amount, p_to_wallet: toWalletId, p_date: date,
    }))
  },
}
