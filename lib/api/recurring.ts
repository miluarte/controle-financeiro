import type { RecurringGroup } from '../types'
import { supabase, unwrap } from '../supabase/client'
import { fromRecurringGroup, toRecurringGroup, toTransaction } from '../supabase/mappers'
import { todayIsoLocal } from '../fatura'

async function getOne(id: string): Promise<RecurringGroup> {
  return toRecurringGroup(unwrap(await supabase.from('recurring_groups').select('*').eq('id', id).single()))
}

export const recurringApi = {
  getAll: async () => {
    const rows = unwrap(await supabase.from('recurring_groups').select('*').order('created_at'))
    return rows.map(toRecurringGroup)
  },

  create: async (data: Omit<RecurringGroup, 'id' | 'createdAt'>) => {
    const groupId = unwrap(
      await supabase.rpc('create_recurring_group', {
        p_type: data.type,
        p_description: data.description,
        p_amount: data.amount,
        p_account_id: data.accountId,
        p_category_id: data.categoryId || null,
        p_frequency: data.frequency,
        p_start_date: data.startDate,
        p_end_date: data.endDate || null,
        p_notes: data.notes || null,
      }),
    ) as string
    const txRows = unwrap(
      await supabase.from('transactions').select('*').eq('recurring_group_id', groupId).order('date'),
    )
    return { group: await getOne(groupId), transactions: txRows.map(toTransaction) }
  },

  update: async (data: Partial<Omit<RecurringGroup, 'id' | 'createdAt'>> & { id: string }) => {
    const { id, ...rest } = data
    unwrap(await supabase.from('recurring_groups').update(fromRecurringGroup(rest)).eq('id', id).select('id').single())
    return getOne(id)
  },

  // Desativa e remove as ocorrências futuras.
  deactivate: async (groupId: string) => {
    unwrap(await supabase.from('recurring_groups').update({ active: false }).eq('id', groupId).select('id').single())
    unwrap(
      await supabase.from('transactions').delete()
        .eq('recurring_group_id', groupId).gt('date', todayIsoLocal()),
    )
    return getOne(groupId)
  },
}
