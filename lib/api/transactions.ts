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
  if (t.status !== undefined) r.status = t.status
  if (t.holderId !== undefined) r.holder_id = t.holderId
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

  // Lançamentos pelos ids (ex.: as cobranças dos gastos fixos no cartão).
  getByIds: async (ids: string[]) => {
    if (!ids.length) return []
    const rows = unwrap(await supabase.from('transactions').select('*').in('id', ids))
    return rows.map(toTransaction)
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

  // Fila de pendentes: gastos das automações e compras sem cartão definido (minhas, e as de
  // outras pessoas da família nos meus cartões, que esperam eu dizer qual cartão foi).
  getPending: async (userId: string) =>
    unwrap(await supabase.from('transactions').select('*').eq('status', 'pending')
      .or(`assigned_to.eq.${userId},holder_id.eq.${userId}`)
      .order('created_at', { ascending: false })).map(toTransaction),

  // Fixar: o gasto vira gasto fixo sem fim a partir do mês dele (no crédito, cobrada sozinha na fatura).
  pin: async (id: string) => {
    unwrap(await supabase.rpc('pin_transaction', { p_transaction: id }))
  },

  // Titular escolhe o cartão de uma compra pendente: entra na fatura no nome de quem comprou.
  resolveCardPending: async (id: string, walletId: string) => {
    unwrap(await supabase.rpc('resolve_card_pending', { p_transaction: id, p_wallet: walletId }))
  },

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

  // foto da nota em todas as parcelas da compra
  setGroupReceipt: async (groupId: string, path: string) => {
    unwrap(await supabase.from('transactions').update({ receipt_path: path }).eq('installment_group_id', groupId))
  },

  update: async (id: string, t: Partial<NewTransaction>) =>
    toTransaction(unwrap(await supabase.from('transactions').update(toRow(t)).eq('id', id).select('*').single())),

  // NFC-e já registrada (mesma chave de acesso do QR code): data do lançamento, ou null
  findByChave: async (chave: string): Promise<string | null> => {
    const { data } = await supabase.from('transactions').select('date').contains('source_data', { chave }).limit(1).maybeSingle()
    return (data?.date as string | undefined) ?? null
  },

  createInstallments: async (args: {
    walletId: string; categoryId: string | null; total: number; installments: number
    firstDate: string; place: string | null; start?: number; source?: string
  }): Promise<string> => {
    return unwrap(await supabase.rpc('create_installment_purchase', {
      p_wallet: args.walletId,
      p_category: args.categoryId,
      p_total: args.total,
      p_installments: args.installments,
      p_first_date: args.firstDate,
      p_place: args.place,
      p_start: args.start ?? 1,
      ...(args.source ? { p_source: args.source } : {}),
    })) as string
  },

  // local e categoria dos gastos recentes, para sugerir categoria sem IA (lib/category-suggest.ts)
  placeHistory: async (): Promise<{ place: string | null; categoryId: string | null }[]> =>
    unwrap(await supabase.from('transactions').select('place, category_id').eq('type', 'expense').eq('status', 'confirmed')
      .not('category_id', 'is', null).not('place', 'is', null).order('date', { ascending: false }).limit(2000))
      .map(r => ({ place: r.place as string | null, categoryId: r.category_id as string | null })),

  // partes de uma parcela de compra dividida (a original e as de cada pessoa)
  splitParts: async (rootId: string) =>
    unwrap(await supabase.from('transactions').select('*').or(`id.eq.${rootId},source_data->>split_of.eq.${rootId}`)).map(toTransaction),

  // ajusta o valor de uma pessoa na parcela e recalcula a divisão em todas as partes
  adjustSplitPart: async (id: string, amount: number) => {
    const { error } = await supabase.rpc('adjust_split_part', { p_transaction: id, p_amount: amount })
    if (error) throw new Error(error.message)
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
