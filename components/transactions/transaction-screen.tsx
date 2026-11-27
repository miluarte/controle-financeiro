'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GlassButton } from '@/components/ios/glass-button'
import { LargeTitleHeader } from '@/components/ios/large-title-header'
import { LoadingBlock } from '@/components/shared/loading-dots'
import { useTransaction } from '@/hooks/use-transaction'
import { QuickAddSheet } from './quick-add-sheet'
import { TransactionDetail } from './transaction-detail'
import { TransactionEditSheet } from './transaction-edit-sheet'

// Página do lançamento (entrada ou saída): seta de voltar, Editar e o detalhe. Editar abre o mesmo formulário
// do Novo gasto, preenchido com a compra inteira; ao salvar, a página mostra o lançamento atualizado.
// Pagamento de fatura, acerto e transferência (que o formulário não registra) editam na folha própria.
export function TransactionScreen({ id }: { id: string }) {
  const router = useRouter()
  const { t, me, form, info, other, ownerCategories, category, wallet, gone } = useTransaction(id)
  const [editing, setEditing] = useState(false)

  // excluído (no formulário ou em outro aparelho): volta para a lista
  useEffect(() => { if (gone) router.back() }, [gone, router])

  const ready = !!t && (!form || (!!info && (!other || !!ownerCategories)))
  return (
    <>
      <LargeTitleHeader back title=""
        actions={ready ? <GlassButton size="capsule" onClick={() => setEditing(true)}>Editar</GlassButton> : undefined} />
      <div className="space-y-8 px-4 pt-4 pb-8">
        {!ready ? <LoadingBlock /> : (
          <TransactionDetail transaction={t} info={info} wallet={wallet} category={category}
            onInstallments={() => router.push(`/transactions/${id}/parcelas`)} onEdit={() => setEditing(true)} />
        )}
      </div>

      {editing && t && (form ? (
        info && me && (
          <QuickAddSheet key={`edit-${t.id}`} open onOpenChange={o => { if (!o) setEditing(false) }}
            edit={{ tx: t, info, me, categories: other ? ownerCategories : undefined }}
            // registrada de novo (mudou valor, parcelas ou divisão): a página passa para o lançamento novo
            onSaved={next => { if (next && next !== id) router.replace(`/transactions/${next}`) }} />
        )
      ) : <TransactionEditSheet transaction={t} onClose={() => setEditing(false)} />)}
    </>
  )
}
