'use client'

import useSWR from 'swr'
import { useSession } from '@/hooks/use-session'
import { categoriesApi } from '@/lib/api/categories'
import { transactionsApi } from '@/lib/api/transactions'
import type { Transaction } from '@/lib/types'
import { QuickAddSheet } from './quick-add-sheet'
import { TransactionEditSheet } from './transaction-edit-sheet'

const FORM_TYPES = ['expense', 'income', 'save_apply', 'save_redeem']

// Tocar num lançamento abre o mesmo formulário do Novo gasto, preenchido com a compra inteira e tudo editável.
// Pagamento de fatura, acerto e transferência (que o formulário não registra) abrem só para ver e excluir.
export function TransactionEditor({ transaction: t, onClose }: { transaction: Transaction | null; onClose: () => void }) {
  const { session } = useSession()
  const me = session?.user.id ?? ''
  const form = !!t && FORM_TYPES.includes(t.type)
  const { data: info } = useSWR(form ? ['purchase-info', t!.id] : null, () => transactionsApi.purchaseInfo(t!.id))
  // compra de outra pessoa (sem divisão): a categoria sai das categorias dela
  const other = form && !!me && t!.owner !== me && !Array.isArray(t!.sourceData?.split_parts)
  const { data: ownerCategories } = useSWR(other ? ['member-categories', t!.owner] : null, () => categoriesApi.ofMember(t!.owner))

  if (t && !form) return <TransactionEditSheet transaction={t} onClose={onClose} />
  if (!t || !info || !me || (other && !ownerCategories)) return null
  return (
    <QuickAddSheet key={t.id} open onOpenChange={o => { if (!o) onClose() }}
      edit={{ tx: t, info, me, categories: other ? ownerCategories : undefined }} />
  )
}
