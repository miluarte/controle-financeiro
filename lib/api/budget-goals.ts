import type { BudgetGoal } from '../types'
import { supabase, unwrap } from '../supabase/client'
import { fromBudgetGoal, toBudgetGoal } from '../supabase/mappers'

export const budgetGoalsApi = {
  getByMonth: async (month: string) => {
    const rows = unwrap(
      await supabase.from('budget_goals').select('*')
        .or(`is_recurring.eq.true,month.eq.${month}`)
        .order('created_at'),
    )
    return rows.map(toBudgetGoal)
  },

  create: async (data: Omit<BudgetGoal, 'id' | 'createdAt'>) => {
    const row = unwrap(await supabase.from('budget_goals').insert(fromBudgetGoal(data)).select('*').single())
    return toBudgetGoal(row)
  },

  update: async (data: Partial<BudgetGoal> & { id: string }) => {
    const { id, ...rest } = data
    const row = unwrap(
      await supabase.from('budget_goals').update(fromBudgetGoal(rest)).eq('id', id).select('*').single(),
    )
    return toBudgetGoal(row)
  },

  delete: async (id: string) => {
    unwrap(await supabase.from('budget_goals').delete().eq('id', id))
    return { id }
  },
}
