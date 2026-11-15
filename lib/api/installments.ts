import type { InstallmentGroup } from '../types'
import { supabase, unwrap } from '../supabase/client'
import { toInstallmentGroup, toTransaction } from '../supabase/mappers'
import { todayIsoLocal } from '../fatura'

async function getOne(id: string): Promise<InstallmentGroup> {
  return toInstallmentGroup(unwrap(await supabase.from('installment_groups').select('*').eq('id', id).single()))
}

// Quitar/cancelar: muda o status e remove as parcelas que ainda não aconteceram.
async function closeGroup(groupId: string, status: 'paid_off' | 'cancelled') {
  unwrap(await supabase.from('installment_groups').update({ status }).eq('id', groupId).select('id').single())
  if (status === 'cancelled') {
    unwrap(
      await supabase.from('transactions').delete()
        .eq('installment_group_id', groupId).gt('date', todayIsoLocal()),
    )
  }
  return getOne(groupId)
}

export const installmentsApi = {
  getAll: async () => {
    const rows = unwrap(await supabase.from('installment_groups').select('*').order('created_at'))
    return rows.map(toInstallmentGroup)
  },

  getByAccount: async (accountId: string) => {
    const rows = unwrap(
      await supabase.from('installment_groups').select('*').eq('account_id', accountId).order('created_at'),
    )
    return rows.map(toInstallmentGroup)
  },

  create: async (data: Omit<InstallmentGroup, 'id' | 'createdAt' | 'paidCount' | 'status'>) => {
    const groupId = unwrap(
      await supabase.rpc('create_installment_group', {
        p_description: data.description,
        p_total_amount: data.totalAmount,
        p_installment_count: data.installmentCount,
        p_installment_amount: data.installmentAmount,
        p_account_id: data.accountId,
        p_category_id: data.categoryId || null,
        p_start_date: data.startDate,
      }),
    ) as string
    const txRows = unwrap(
      await supabase.from('transactions').select('*').eq('installment_group_id', groupId).order('date'),
    )
    return { group: await getOne(groupId), transactions: txRows.map(toTransaction) }
  },

  update: async (data: {
    id: string
    description?: string
    categoryId?: string | null
    accountId?: string
    totalAmount?: number
    installmentCount?: number
    installmentAmount?: number
    startDate?: string
  }) => {
    unwrap(
      await supabase.rpc('update_installment_group', {
        p_id: data.id,
        p_description: data.description ?? null,
        p_total_amount: data.totalAmount ?? null,
        p_installment_count: data.installmentCount ?? null,
        p_installment_amount: data.installmentAmount ?? null,
        p_account_id: data.accountId ?? null,
        p_category_id: data.categoryId ?? null,
        p_start_date: data.startDate ?? null,
      }),
    )
    return getOne(data.id)
  },

  cancel: (groupId: string) => closeGroup(groupId, 'cancelled'),

  payOff: (groupId: string) => closeGroup(groupId, 'paid_off'),
}
