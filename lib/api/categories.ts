import { supabase, unwrap } from '../supabase/client'
import { toCategory } from '../supabase/mappers'

export const categoriesApi = {
  getActive: async () => {
    const rows = unwrap(
      await supabase.from('categories').select('*').eq('active', true).order('sort_order').order('name'),
    )
    return rows.map(toCategory)
  },
}
