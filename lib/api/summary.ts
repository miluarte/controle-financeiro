import { supabase, unwrap } from '../supabase/client'
import { toMonthSummary } from '../supabase/mappers'

export const summaryApi = {
  month: async (month: string) =>
    toMonthSummary(unwrap(await supabase.rpc('month_summary', { p_month: `${month}-01` }))),
}
