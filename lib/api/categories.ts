import type { Category, CategoryInput } from '../types'
import { supabase, unwrap } from '../supabase/client'
import { toCategory } from '../supabase/mappers'

// Categorias sempre em ordem alfabética (português, sem diferenciar acento nem maiúscula).
const byName = (list: Category[]) =>
  list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }))

export const categoriesApi = {
  getActive: async () => {
    const rows = unwrap(
      await supabase.from('categories').select('*').eq('active', true),
    )
    return byName(rows.map(toCategory))
  },

  getAll: async () => {
    const rows = unwrap(await supabase.from('categories').select('*'))
    return byName(rows.map(toCategory))
  },

  // categorias de outra pessoa da família (titular escolhendo a categoria de uma compra dela)
  ofMember: async (userId: string) => {
    const { data, error } = await supabase.rpc('member_categories', { p_user: userId })
    if (error) throw new Error(error.message)
    return byName(((data ?? []) as Record<string, unknown>[]).map(toCategory))
  },

  // CAT-3: quantidade de lançamentos por categoria
  usage: async () => {
    const rows = unwrap(await supabase.from('category_usage').select('*'))
    return new Map<string, number>(rows.map(r => [r.category_id as string, Number(r.transactions)]))
  },

  create: async (c: CategoryInput, sortOrder: number) =>
    toCategory(unwrap(await supabase.from('categories').insert({ ...c, sort_order: sortOrder }).select('*').single())),

  update: async (id: string, patch: Partial<CategoryInput> & { active?: boolean; sort_order?: number }) => {
    unwrap(await supabase.from('categories').update(patch).eq('id', id))
  },

  // CAT-5: o banco só deixa excluir categoria sem lançamentos.
  remove: async (id: string) => {
    const { count } = await supabase.from('categories').delete({ count: 'exact' }).eq('id', id)
    if (!count) throw new Error('Esta categoria tem lançamentos. Arquive em vez de excluir.')
  },
}
