import type { Category } from '../types'
import { supabase, unwrap } from '../supabase/client'
import { toCategory } from '../supabase/mappers'
import { byName } from '../categories'

// Categorias universais: a mesma lista para todos, só leitura (o banco não aceita escrita do app).
// Ordem alfabética com "Outros" por último (byName); a árvore sai de lib/categories.ts.
const sorted = (list: Category[]) => list.sort(byName)

export const categoriesApi = {
  getActive: async () => {
    const rows = unwrap(
      await supabase.from('categories').select('*').eq('active', true),
    )
    return sorted(rows.map(toCategory))
  },

  getAll: async () => {
    const rows = unwrap(await supabase.from('categories').select('*'))
    return sorted(rows.map(toCategory))
  },

  // categorias vistas por outra pessoa da família (hoje a mesma lista universal)
  ofMember: async (userId: string) => {
    const { data, error } = await supabase.rpc('member_categories', { p_user: userId })
    if (error) throw new Error(error.message)
    return sorted(((data ?? []) as Record<string, unknown>[]).map(toCategory))
  },

  // CAT-3: quantidade de lançamentos por categoria
  usage: async () => {
    const rows = unwrap(await supabase.from('category_usage').select('*'))
    return new Map<string, number>(rows.map(r => [r.category_id as string, Number(r.transactions)]))
  },
}
