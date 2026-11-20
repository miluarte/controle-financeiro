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

  // quanto já foi pago de cada fatura dos meus cartões (pagamento parcial), sem os antecipados de compra
  paidAmounts: async (fromRef: string, toRef: string): Promise<{ walletId: string; invoiceRef: string; paid: number }[]> =>
    unwrap(await supabase.from('invoice_paid').select('*').gte('invoice_ref', fromRef).lte('invoice_ref', toRef))
      .map(r => ({ walletId: r.wallet_id as string, invoiceRef: (r.invoice_ref as string).slice(0, 7), paid: Number(r.paid) })),

  pay: async (cardId: string, ref: string, fromWalletId: string, date: string, amount?: number) => {
    unwrap(await supabase.rpc('pay_invoice', {
      p_card: cardId, p_ref: ref, p_from_wallet: fromWalletId, p_date: date, p_amount: amount ?? null,
    }))
  },

  // desfaz todos os pagamentos da fatura (inclusive os parciais)
  unpay: async (cardId: string, ref: string) => {
    unwrap(await supabase.rpc('unpay_invoice', { p_card: cardId, p_ref: ref }))
  },
}
