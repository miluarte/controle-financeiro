'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { ModalSheet } from '@/components/ios/modal-sheet'
import { LoadingBlock } from '@/components/shared/loading-dots'
import { useCategories } from '@/hooks/use-categories'
import { useSession } from '@/hooks/use-session'
import { useWallets } from '@/hooks/use-wallets'
import { categoriesApi } from '@/lib/api/categories'
import { transactionsApi } from '@/lib/api/transactions'
import type { Transaction } from '@/lib/types'
import { InstallmentsSheet } from './installments-sheet'
import { QuickAddSheet } from './quick-add-sheet'
import { TransactionDetail } from './transaction-detail'
import { TransactionEditSheet } from './transaction-edit-sheet'
import { TYPE_LABEL } from './transaction-item'

const FORM_TYPES = ['expense', 'income', 'save_apply', 'save_redeem']

// Tocar num lançamento abre o detalhe dele. "Editar" abre o mesmo formulário do Novo gasto, preenchido com a
// compra inteira e tudo editável; ao salvar, volta para o detalhe já atualizado.
// Pagamento de fatura, acerto e transferência (que o formulário não registra) editam na folha própria.
export function TransactionEditor({ transaction, onClose }: { transaction: Transaction | null; onClose: () => void }) {
  if (!transaction) return null
  return <TransactionView key={transaction.id} id={transaction.id} initial={transaction} onClose={onClose} />
}

export function TransactionView({ id: initialId, initial, onClose }: { id: string; initial?: Transaction; onClose: () => void }) {
  const { session } = useSession()
  const me = session?.user.id ?? ''
  const { categories } = useCategories()
  const { wallets } = useWallets()
  // a edição que muda a estrutura (valor, parcelas, divisão) registra a compra de novo, com outro id
  const [id, setId] = useState(initialId)
  const [editing, setEditing] = useState(false)
  const [installments, setInstallments] = useState(false)

  const { data: fetched, isLoading } = useSWR(['transaction', id], () => transactionsApi.getOne(id))
  const t = fetched === undefined && initial?.id === id ? initial : fetched ?? null
  const form = !!t && FORM_TYPES.includes(t.type)
  const { data: info } = useSWR(form ? ['purchase-info', id] : null, () => transactionsApi.purchaseInfo(id))
  // compra de outra pessoa (sem divisão): a categoria sai das categorias dela
  const other = form && !!me && t!.owner !== me && !Array.isArray(t!.sourceData?.split_parts)
  const { data: ownerCategories } = useSWR(other ? ['member-categories', t!.owner] : null, () => categoriesApi.ofMember(t!.owner))

  // excluído (no formulário ou em outro aparelho): fecha
  const gone = fetched === null && !isLoading
  useEffect(() => { if (gone) onClose() }, [gone, onClose])
  if (!t) return null

  const category = (other ? ownerCategories : categories)?.find(c => c.id === t.categoryId)
  const wallet = wallets.find(w => w.id === t.walletId)

  return (
    <>
      <ModalSheet open={!editing && !installments} onOpenChange={o => { if (!o) onClose() }}
        title={TYPE_LABEL[t.type]} actionLabel="Editar" onAction={() => setEditing(true)}
        actionDisabled={form && (!info || (other && !ownerCategories))}>
        {form && !info ? <LoadingBlock /> : (
          <TransactionDetail transaction={t} info={info} wallet={wallet} category={category}
            onInstallments={() => setInstallments(true)} />
        )}
      </ModalSheet>

      {t.installmentGroupId && (
        <InstallmentsSheet open={installments} onOpenChange={setInstallments} transaction={t} info={info} wallet={wallet} />
      )}

      {editing && (form ? (
        info && me && (
          <QuickAddSheet key={`edit-${t.id}`} open onOpenChange={o => { if (!o) setEditing(false) }}
            edit={{ tx: t, info, me, categories: other ? ownerCategories : undefined }}
            onSaved={next => { if (next) setId(next) }} />
        )
      ) : <TransactionEditSheet transaction={t} onClose={() => setEditing(false)} />)}
    </>
  )
}
