import type { Category, CategoryType } from './types'

// Categorias universais em dois níveis: principal (parentId nulo) e subcategorias.
// O gasto pode guardar a subcategoria, mas a tela mostra sempre a principal; a subcategoria
// só aparece na escolha e no detalhamento da análise.

const byName = (a: Category, b: Category) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })

export interface CategoryGroup { parent: Category; children: Category[] }

// Principais em ordem alfabética e, dentro de cada uma, as subcategorias em ordem alfabética.
export function categoryTree(categories: Category[], type?: CategoryType): CategoryGroup[] {
  const list = type ? categories.filter(c => c.type === type) : categories
  const children = new Map<string, Category[]>()
  for (const c of list) if (c.parentId) children.set(c.parentId, [...(children.get(c.parentId) ?? []), c])
  return list.filter(c => !c.parentId).sort(byName)
    .map(parent => ({ parent, children: (children.get(parent.id) ?? []).sort(byName) }))
}

// Só as principais (filtros, metas, análise).
export const rootCategories = (categories: Category[]) => categories.filter(c => !c.parentId)

// id de qualquer categoria -> a principal dela (a própria, quando já é principal)
export function displayCategoryMap(categories: Category[]): Map<string, Category> {
  const byId = new Map(categories.map(c => [c.id, c]))
  return new Map(categories.map(c => [c.id, (c.parentId && byId.get(c.parentId)) || c]))
}

// id da principal de uma categoria
export function rootId(categories: Category[], id: string | null): string | null {
  if (!id) return null
  const c = categories.find(x => x.id === id)
  return c?.parentId ?? id
}
