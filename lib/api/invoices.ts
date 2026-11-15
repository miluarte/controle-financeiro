import type { Invoice } from '../types'
import { supabase, unwrap } from '../supabase/client'
import { toInvoiceTotal } from '../supabase/mappers'

export const invoicesApi = {
  // Totais por cartão, fatura e pessoa (o RLS limita o que cada um vê).
  totals: async (fromRef: string, toRef: string) => {
    const rows = unwrap(
      await supabase.from('invoice_totals').select('*').gte('invoice_ref', fromRef).lte('invoice_ref', toRef),
    )
    return rows.map(toInvoiceTotal)
  },

  paid: async (fromRef: string, toRef: string): Promise<Invoice[]> => {
    const rows = unwrap(
      await supabase.from('invoices').select('wallet_id, ref_month, paid_at')
        .gte('ref_month', fromRef).lte('ref_month', toRef),
    )
    return rows.map(r => ({ walletId: r.wallet_id, refMonth: r.ref_month, paidAt: r.paid_at }))
  },

  pay: async (cardId: string, ref: string, fromWalletId: string, date: string, amount?: number) => {
    unwrap(await supabase.rpc('pay_invoice', {
      p_card: cardId, p_ref: ref, p_from_wallet: fromWalletId, p_date: date, p_amount: amount ?? null,
    }))
  },

  unpay: async (cardId: string, ref: string) => {
    const inv = unwrap(
      await supabase.from('invoices').select('payment_transaction_id').eq('wallet_id', cardId).eq('ref_month', ref).single(),
    )
    unwrap(await supabase.from('invoices').update({ paid_at: null, payment_transaction_id: null }).eq('wallet_id', cardId).eq('ref_month', ref))
    if (inv.payment_transaction_id) {
      unwrap(await supabase.from('transactions').delete().eq('id', inv.payment_transaction_id))
    }
  },
}
