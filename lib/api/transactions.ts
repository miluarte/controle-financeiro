import type { NewTransaction, Transaction } from '../types'
import { supabase, unwrap } from '../supabase/client'
import { toTransaction } from '../supabase/mappers'
import { monthRange } from '../utils'

function toRow(t: Partial<NewTransaction>) {
  const r: Record<string, unknown> = {}
  if (t.type !== undefined) r.type = t.type
  if (t.amount !== undefined) r.amount = t.amount
  if (t.date !== undefined) r.date = t.date
  if (t.categoryId !== undefined) r.category_id = t.categoryId
  if (t.walletId !== undefined) r.wallet_id = t.walletId
  if (t.place !== undefined) r.place = t.place
  if (t.description !== undefined) r.description = t.description
  if (t.source !== undefined) r.source = t.source
  if (t.sourceData !== undefined) r.source_data = t.sourceData
  if (t.receiptPath !== undefined) r.receipt_path = t.receiptPath
  return r
}

export const transactionsApi = {
  // Lançamentos do mês que são meus (atribuídos a mim). Compras de membros nos meus
  // cartões chegam pelo RLS, mas não entram aqui (5.7.7).
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

  // Todas as minhas (exportação CSV e detecção de duplicadas na importação).
  getAllMine: async (userId: string) => {
    const all: Transaction[] = []
    for (let from = 0; ; from += 1000) {
      const rows = unwrap(
        await supabase.from('transactions').select('*').eq('assigned_to', userId).eq('status', 'confirmed')
          .order('date').range(from, from + 999),
      )
      all.push(...rows.map(toTransaction))
      if (rows.length < 1000) break
    }
    return all
  },

  // Compras de um cartão numa fatura (todas que eu posso ver).
  getByInvoice: async (walletId: string, invoiceRef: string) => {
    const rows = unwrap(
      await supabase.from('transactions').select('*')
        .eq('wallet_id', walletId).eq('invoice_ref', invoiceRef).eq('type', 'expense').eq('status', 'confirmed')
        .order('date', { ascending: false }),
    )
    return rows.map(toTransaction)
  },

  create: async (t: NewTransaction) =>
    toTransaction(unwrap(await supabase.from('transactions').insert(toRow(t)).select('*').single())),

  createMany: async (list: NewTransaction[]) => {
    if (list.length === 0) return
    unwrap(await supabase.from('transactions').insert(list.map(toRow)))
  },

  // Fila de pendentes (automações do iPhone): gastos que ainda precisam de confirmação.
  getPending: async (userId: string) =>
    unwrap(await supabase.from('transactions').select('*').eq('assigned_to', userId).eq('status', 'pending')
      .order('created_at', { ascending: false })).map(toTransaction),

  confirmPending: async (id: string, t: Partial<NewTransaction>) => {
    unwrap(await supabase.from('transactions').update({ ...toRow(t), status: 'confirmed' }).eq('id', id))
  },

  // Pagar uma compra do cartão (ou uma parcela) antes da fatura.
  prepay: async (id: string, fromWalletId: string, date: string) => {
    unwrap(await supabase.rpc('prepay_purchase', { p_transaction: id, p_from_wallet: fromWalletId, p_date: date }))
  },
  undoPrepay: async (id: string) => {
    unwrap(await supabase.rpc('undo_prepay_purchase', { p_transaction: id }))
  },

  // Itens de uma compra parcelada valem para todas as parcelas.
  setGroupItems: async (groupId: string, items: { name: string; amount: number }[]) => {
    const rows = unwrap(await supabase.from('transactions').select('id, source_data').eq('installment_group_id', groupId))
    await Promise.all(rows.map(r =>
      supabase.from('transactions').update({ source_data: { ...(r.source_data ?? {}), items } }).eq('id', r.id)))
  },

  update: async (id: string, t: Partial<NewTransaction>) =>
    toTransaction(unwrap(await supabase.from('transactions').update(toRow(t)).eq('id', id).select('*').single())),

  createInstallments: async (args: {
    walletId: string; categoryId: string | null; total: number; installments: number
    firstDate: string; place: string | null; start?: number
  }): Promise<string> => {
    return unwrap(await supabase.rpc('create_installment_purchase', {
      p_wallet: args.walletId,
      p_category: args.categoryId,
      p_total: args.total,
      p_installments: args.installments,
      p_first_date: args.firstDate,
      p_place: args.place,
      p_start: args.start ?? 1,
    })) as string
  },

  idsOfGroup: async (groupId: string) =>
    unwrap(await supabase.from('transactions').select('id').eq('installment_group_id', groupId)).map(r => r.id as string),

  remove: async (id: string) => {
    unwrap(await supabase.from('transactions').delete().eq('id', id))
  },

  // Exclui todas as parcelas ainda não lançadas de uma compra parcelada.
  removeInstallmentGroup: async (groupId: string) => {
    unwrap(await supabase.from('transactions').delete().eq('installment_group_id', groupId))
    unwrap(await supabase.from('installment_groups').delete().eq('id', groupId))
  },
}
