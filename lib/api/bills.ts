import type { BillInput, BillOccurrence } from '../types'
import { supabase, unwrap } from '../supabase/client'
import { toBillOccurrence } from '../supabase/mappers'
import { todayIso } from '../utils'

function toRow(b: Partial<BillInput>) {
  const r: Record<string, unknown> = {}
  if (b.type !== undefined) r.type = b.type
  if (b.name !== undefined) r.name = b.name
  if (b.amount !== undefined) r.amount = b.amount
  if (b.dueDay !== undefined) r.due_day = b.dueDay
  if (b.dueNextMonth !== undefined) r.due_next_month = b.dueNextMonth
  if (b.categoryId !== undefined) r.category_id = b.categoryId
  if (b.recurring !== undefined) r.recurring = b.recurring
  if (b.startMonth !== undefined) r.start_month = b.startMonth
  if (b.installmentCurrent !== undefined) r.installment_current = b.installmentCurrent
  if (b.installmentsTotal !== undefined) r.installments_total = b.installmentsTotal
  if (b.endMonth !== undefined) r.end_month = b.endMonth
  if (b.walletId !== undefined) r.wallet_id = b.walletId
  if (b.recipient !== undefined) r.recipient = b.recipient ? { user_id: b.recipient.userId, name: b.recipient.name } : null
  return r
}

// conta cobrada no cartão: os gastos já lançados para datas futuras saem (e as ocorrências voltam a
// ficar em aberto), para serem refeitos com os dados novos ou não voltarem depois de encerrar.
async function removeFutureCardCharges(billId: string) {
  const today = todayIso()
  const future = unwrap(await supabase.from('transactions').select('id').eq('bill_id', billId).eq('type', 'expense').gt('date', today))
  if (!future.length) return
  const ids = future.map(r => r.id as string)
  unwrap(await supabase.from('bill_occurrences').update({ paid_at: null, transaction_id: null }).in('transaction_id', ids))
  unwrap(await supabase.from('transactions').delete().in('id', ids))
}

export const billsApi = {
  // ids das contas fixas ativas (para saber quais gastos estão fixados)
  activeIds: async (): Promise<string[]> =>
    unwrap(await supabase.from('bills').select('id').eq('active', true)).map(r => r.id as string),

  // CON-2: contas do mês. Gera as ocorrências que faltam antes de ler.
  getMonth: async (month: string) => {
    unwrap(await supabase.rpc('ensure_bill_occurrences', { p_month: `${month}-01` }))
    const rows = unwrap(
      await supabase.from('bill_occurrences').select('*, bills(*, wallet:wallets(type))')
        .eq('ref_month', `${month}-01`).eq('skipped', false).order('due_date'),
    )
    return rows.map(toBillOccurrence)
  },

  create: async (b: BillInput): Promise<string> => {
    return unwrap(await supabase.from('bills').insert(toRow(b)).select('id').single()).id as string
  },

  // CON-9: "só este mês" muda a ocorrência; "este e os seguintes" muda a conta e as ocorrências futuras em aberto.
  updateOccurrence: async (occurrenceId: string, amount: number, dueDate: string) => {
    unwrap(await supabase.from('bill_occurrences').update({ amount, due_date: dueDate }).eq('id', occurrenceId))
  },

  updateSeries: async (billId: string, fromMonth: string, b: Partial<BillInput>) => {
    await removeFutureCardCharges(billId)
    unwrap(await supabase.from('bills').update(toRow(b)).eq('id', billId))
    // ocorrências deste mês em diante ainda não pagas são recriadas com os novos dados
    unwrap(
      await supabase.from('bill_occurrences').delete()
        .eq('bill_id', billId).gte('ref_month', `${fromMonth}-01`).is('paid_at', null),
    )
    // as já pagas ficam, mas passam a valer o novo valor, junto com o gasto do pagamento
    if (b.amount !== undefined) {
      const paid = unwrap(
        await supabase.from('bill_occurrences').update({ amount: b.amount })
          .eq('bill_id', billId).gte('ref_month', `${fromMonth}-01`).not('paid_at', 'is', null)
          .select('transaction_id'),
      )
      const txIds = paid.map(r => r.transaction_id as string | null).filter((id): id is string => !!id)
      if (txIds.length) unwrap(await supabase.from('transactions').update({ amount: b.amount }).in('id', txIds))
    }
  },

  // Encerra a conta a partir deste mês (mantém o histórico pago).
  endSeries: async (billId: string, fromMonth: string) => {
    await removeFutureCardCharges(billId)
    unwrap(await supabase.from('bills').update({ active: false }).eq('id', billId))
    unwrap(
      await supabase.from('bill_occurrences').delete()
        .eq('bill_id', billId).gte('ref_month', `${fromMonth}-01`).is('paid_at', null),
    )
  },

  // "Só este mês": o mês fica pulado (não volta a ser gerado, não avisa, não entra no cartão) e o
  // lançamento do pagamento, se houver, sai.
  skip: async (o: BillOccurrence) => {
    unwrap(await supabase.from('bill_occurrences')
      .update({ skipped: true, paid_at: o.paidAt ?? o.dueDate, transaction_id: null }).eq('id', o.id))
    if (o.transactionId) unwrap(await supabase.from('transactions').delete().eq('id', o.transactionId))
  },

  // gasto único a pagar: sai o mês e a conta deixa de existir em Contas
  removeSingle: async (o: BillOccurrence) => {
    await billsApi.skip(o)
    unwrap(await supabase.from('bills').update({ active: false }).eq('id', o.billId))
  },

  pay: async (occurrenceId: string, walletId: string | null, date: string) => {
    unwrap(await supabase.rpc('pay_bill_occurrence', { p_occurrence: occurrenceId, p_wallet: walletId, p_date: date }))
  },

  unpay: async (occurrenceId: string) => {
    unwrap(await supabase.rpc('unpay_bill_occurrence', { p_occurrence: occurrenceId }))
  },
}
