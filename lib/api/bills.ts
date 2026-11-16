import type { BillInput } from '../types'
import { supabase, unwrap } from '../supabase/client'
import { toBillOccurrence } from '../supabase/mappers'

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
  return r
}

export const billsApi = {
  // CON-2: contas do mês. Gera as ocorrências que faltam antes de ler.
  getMonth: async (month: string) => {
    unwrap(await supabase.rpc('ensure_bill_occurrences', { p_month: `${month}-01` }))
    const rows = unwrap(
      await supabase.from('bill_occurrences').select('*, bills(*)')
        .eq('ref_month', `${month}-01`).order('due_date'),
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
    unwrap(await supabase.from('bills').update(toRow(b)).eq('id', billId))
    // ocorrências deste mês em diante ainda não pagas são recriadas com os novos dados
    unwrap(
      await supabase.from('bill_occurrences').delete()
        .eq('bill_id', billId).gte('ref_month', `${fromMonth}-01`).is('paid_at', null),
    )
  },

  // Encerra a conta a partir deste mês (mantém o histórico pago).
  endSeries: async (billId: string, fromMonth: string) => {
    unwrap(await supabase.from('bills').update({ active: false }).eq('id', billId))
    unwrap(
      await supabase.from('bill_occurrences').delete()
        .eq('bill_id', billId).gte('ref_month', `${fromMonth}-01`).is('paid_at', null),
    )
  },

  pay: async (occurrenceId: string, walletId: string | null, date: string) => {
    unwrap(await supabase.rpc('pay_bill_occurrence', { p_occurrence: occurrenceId, p_wallet: walletId, p_date: date }))
  },

  unpay: async (occurrenceId: string) => {
    unwrap(await supabase.rpc('unpay_bill_occurrence', { p_occurrence: occurrenceId }))
  },
}
