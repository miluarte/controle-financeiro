import type { Category } from '../types'
import { supabase, unwrap } from '../supabase/client'
import { fromCategory, toCategory } from '../supabase/mappers'

export const categoriesApi = {
  getAll: async () => {
    const rows = unwrap(await supabase.from('categories').select('*').order('created_at'))
    return rows.map(toCategory)
  },

  create: async (data: Omit<Category, 'id' | 'createdAt'>) => {
    const row = unwrap(await supabase.from('categories').insert(fromCategory(data)).select('*').single())
    return toCategory(row)
  },
}
