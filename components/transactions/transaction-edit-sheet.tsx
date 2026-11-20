'use client'

import { useState } from 'react'
import { CategoryField } from '@/components/shared/category-field'
import { WalletPicker } from '@/components/shared/wallet-picker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormRow } from '@/components/ios/form-row'
import { ListGroup } from '@/components/ios/list-group'
import { ModalSheet } from '@/components/ios/modal-sheet'
import { CurrencyInput } from '@/components/shared/currency-input'
import { useCategories } from '@/hooks/use-categories'
import { useRefresh } from '@/hooks/use-refresh'
import { useWallets } from '@/hooks/use-wallets'
import { transactionsApi } from '@/lib/api/transactions'
import type { Transaction } from '@/lib/types'
import { TYPE_LABEL } from './transaction-item'
import { receiptUrl, type ReceiptItem } from '@/lib/receipt'
import { DateField } from '@/components/shared/date-field'
import { ItemsEditor } from './items-editor'
import { PrepayGroup } from './prepay-group'
import { useTransactionDelete } from './use-transaction-delete'

// TRA-6: abrir, editar e excluir um lançamento.
export function TransactionEditSheet({
  transaction, onClose,
}: { transaction: Transaction | null; onClose: () => void }) {
  const del = useTransactionDelete(onClose)
  const t = transaction

  return (
    <>
      <ModalSheet
        open={!!t}
        onOpenChange={o => { if (!o) onClose() }}
        title={t ? TYPE_LABEL[t.type] : ''}
        formId="edit-transaction"
        actionLabel="Salvar"
        onDelete={() => t && del.ask(t)}
      >
        {t && <EditForm key={t.id} t={t} onDone={onClose} />}
      </ModalSheet>
      {del.sheet}
    </>
  )
}

function EditForm({ t, onDone }: { t: Transaction; onDone: () => void }) {
  const { categories } = useCategories()
  const { wallets } = useWallets()
  const refresh = useRefresh()
  const [amount, setAmount] = useState(t.amount)
  const [date, setDate] = useState(t.date)
  const [categoryId, setCategoryId] = useState(t.categoryId)
  const [walletId, setWalletId] = useState(t.walletId)
  const [text, setText] = useState(t.type === 'income' ? t.description ?? '' : t.place ?? '')
  const [items, setItems] = useState<ReceiptItem[]>((t.sourceData?.items as ReceiptItem[] | undefined) ?? [])
  const [error, setError] = useState<string | null>(null)
  const [, setBusy] = useState(false)

  const editable = ['expense', 'income', 'save_apply', 'save_redeem'].includes(t.type)
  const catType = t.type === 'income' ? 'income' : 'expense'
  const showCategory = t.type === 'expense' || t.type === 'income'
  const showWallet = t.type !== 'income'

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!editable || amount <= 0) return
    setBusy(true); setError(null)
    try {
      await transactionsApi.update(t.id, {
        amount, date, categoryId, walletId,
        ...(t.type === 'expense' && !t.installmentGroupId && { sourceData: { ...(t.sourceData ?? {}), items } }),
        ...(t.type === 'income' ? { description: text.trim() || null } : { place: text.trim() || null }),
      })
      if (t.type === 'expense' && t.installmentGroupId) await transactionsApi.setGroupItems(t.installmentGroupId, items)
      await refresh(); onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.')
    } finally { setBusy(false) }
  }

  return (
    <form id="edit-transaction" onSubmit={save} className="space-y-6">
      <CurrencyInput id="edit-amount" aria-label="Valor" variant="display" value={amount} onChange={setAmount} disabled={!editable} />

      <ListGroup footer={t.installmentN ? `Parcela ${t.installmentN} de ${t.installmentsTotal}` : undefined}>
        <FormRow label="Data" htmlFor="edit-date">
          <DateField id="edit-date" value={date} disabled={!editable} onChange={v => setDate(v || t.date)} />
        </FormRow>
        <FormRow label={t.type === 'income' ? 'Descrição' : 'Onde?'} htmlFor="edit-text">
          <Input id="edit-text" variant="bare" value={text} onChange={e => setText(e.target.value)}
            placeholder="Opcional" className="text-right" disabled={!editable} />
        </FormRow>
      </ListGroup>

      {((showCategory && editable) || (showWallet && editable && !t.installmentGroupId)) && (
        <ListGroup>
          {showCategory && editable && (
            <CategoryField id="edit-category" categories={categories.filter(c => c.type === catType)} value={categoryId}
              onChange={id => id && setCategoryId(id)} />
          )}
          {showWallet && editable && !t.installmentGroupId && (
            <WalletPicker id="edit-wallet" wallets={wallets} value={walletId} onChange={setWalletId} />
          )}
        </ListGroup>
      )}


      {t.type === 'expense' && <ItemsEditor items={items} onChange={setItems} total={amount} disabled={!editable} />}

      {t.type === 'expense' && t.invoiceRef && wallets.some(w => w.id === t.walletId && w.type === 'credit' && !w.ownerName) && (
        <PrepayGroup t={t} onDone={onDone} />
      )}

      {t.receiptPath && (
        <ListGroup header="Nota fiscal">
            <li className="p-3">
              <Button type="button" variant="secondary" className="w-full rounded-full"
                onClick={async () => { const url = await receiptUrl(t.receiptPath!); if (url) window.open(url, '_blank') }}>
                Ver comprovante
              </Button>
            </li>
        </ListGroup>
      )}

      {error && <p className="px-4 text-footnote text-destructive">{error}</p>}

    </form>
  )
}
