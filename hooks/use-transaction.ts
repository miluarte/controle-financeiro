'use client'

import useSWR from 'swr'
import { useSession } from '@/hooks/use-session'
import { useWallets } from '@/hooks/use-wallets'
import { categoriesApi } from '@/lib/api/categories'
import { displayCategoryMap } from '@/lib/categories'
import { transactionsApi } from '@/lib/api/transactions'

// lançamentos que o formulário do Novo gasto edita (os demais editam na folha própria)
export const FORM_TYPES = ['expense', 'income', 'save_apply', 'save_redeem']

// Um lançamento e o que o detalhe precisa dele: a compra inteira, a carteira e a categoria
// (de outra pessoa, nas categorias dela). gone: foi excluído ou não está mais visível.
export function useTransaction(id: string) {
  const { session } = useSession()
  const me = session?.user.id ?? ''
  // todas as categorias, inclusive as arquivadas: o lançamento pode estar numa categoria arquivada
  const { data: categories } = useSWR(['categories-all'], () => categoriesApi.getAll())
  const { wallets } = useWallets()
  const { data, isLoading } = useSWR(['transaction', id], () => transactionsApi.getOne(id))
  const t = data ?? null
  const form = !!t && FORM_TYPES.includes(t.type)
  const { data: info } = useSWR(form ? ['purchase-info', id] : null, () => transactionsApi.purchaseInfo(id))
  // compra de outra pessoa (sem divisão): a categoria sai das categorias dela
  const other = form && !!me && t!.owner !== me && !Array.isArray(t!.sourceData?.split_parts)
  const { data: ownerCategories } = useSWR(other ? ['member-categories', t!.owner] : null, () => categoriesApi.ofMember(t!.owner))
  // o detalhe mostra a principal (a subcategoria só aparece na escolha e na análise detalhada)
  const list = t ? (other ? ownerCategories : categories) : undefined
  const category = t?.categoryId && list ? displayCategoryMap(list).get(t.categoryId) : undefined
  const wallet = t ? wallets.find(w => w.id === t.walletId) : undefined
  return {
    t, me, form, info, other, ownerCategories, category, wallet,
    loading: data === undefined && isLoading,
    gone: data === null && !isLoading,
  }
}
