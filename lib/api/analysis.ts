import type { CategorySpending, MonthHistory } from '../types'
import { supabase, unwrap } from '../supabase/client'
import { toCategorySpending, toMonthHistory } from '../supabase/mappers'

export const analysisApi = {
  categorySpending: async (month: string): Promise<CategorySpending[]> =>
    unwrap(await supabase.rpc('category_spending', { p_month: `${month}-01` })).map(toCategorySpending),

  history: async (months = 6): Promise<MonthHistory[]> =>
    unwrap(await supabase.rpc('monthly_history', { p_months: months })).map(toMonthHistory),

  getBudget: async (month: string) => {
    const { data } = await supabase.from('budgets').select('total_amount').eq('ref_month', `${month}-01`).maybeSingle()
    return data ? Number(data.total_amount) : null
  },

  setBudget: async (userId: string, month: string, total: number) => {
    unwrap(await supabase.from('budgets').upsert(
      { user_id: userId, ref_month: `${month}-01`, total_amount: total },
      { onConflict: 'user_id,ref_month' },
    ))
  },

  // Meta vigente a partir deste mês (category_goals guarda o histórico).
  setGoal: async (userId: string, categoryId: string, month: string, amount: number | null) => {
    if (amount == null) {
      unwrap(await supabase.from('category_goals').delete().eq('category_id', categoryId).eq('effective_from', `${month}-01`))
      return
    }
    unwrap(await supabase.from('category_goals').upsert(
      { user_id: userId, category_id: categoryId, effective_from: `${month}-01`, goal_amount: amount },
      { onConflict: 'category_id,effective_from' },
    ))
  },
}
