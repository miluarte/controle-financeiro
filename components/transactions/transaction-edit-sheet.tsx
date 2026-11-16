'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormRow } from '@/components/ios/form-row'
import { ListGroup } from '@/components/ios/list-group'
import { ActionSheet } from '@/components/ios/action-sheet'
import { ModalSheet } from '@/components/ios/modal-sheet'
import { ChoiceChip } from '@/components/shared/choice-chip'
import { CurrencyInput } from '@/components/shared/currency-input'
import { TokenIcon } from '@/components/shared/token-icon'
import { useCategories } from '@/hooks/use-categories'
import { useRefresh } from '@/hooks/use-refresh'
import { useWallets } from '@/hooks/use-wallets'
import { transactionsApi } from '@/lib/api/transactions'
import { WALLET_TYPE_ICON } from '@/lib/constants'
import type { Transaction } from '@/lib/types'
import { TYPE_LABEL } from './transaction-item'
import { receiptUrl, type ReceiptItem } from '@/lib/receipt'
import { DateField } from '@/components/shared/date-field'
import { ItemsEditor } from './items-editor'
import { PrepayGroup } from './prepay-group'

// TRA-6: abrir, editar e excluir um lançamento.
export function TransactionEditSheet({
  transaction, onClose,
}: { transaction: Transaction | null; onClose: () => void }) {
  const refresh = useRefresh()
  const [asking, setAsking] = useState(false)
  const t = transaction

  async function remove(all: boolean) {
    if (!t) return
    try {
      if (all && t.installmentGroupId) await transactionsApi.removeInstallmentGroup(t.installmentGroupId)
      else await transactionsApi.remove(t.id)
      await refresh(); onClose()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Não foi possível excluir.')
    }
  }

  return (
    <>
      <ModalSheet
        open={!!t}
        onOpenChange={o => { if (!o) onClose() }}
        title={t ? TYPE_LABEL[t.type] : ''}
        formId="edit-transaction"
        actionLabel="Salvar"
        onDelete={() => setAsking(true)}
      >
        {t && <EditForm key={t.id} t={t} onDone={onClose} />}
      </ModalSheet>
      <ActionSheet open={asking} onOpenChange={setAsking}
        title={t?.installmentGroupId ? 'O que você quer excluir?' : 'Excluir este lançamento?'}
        actions={t?.installmentGroupId
          ? [{ label: 'Só esta parcela', destructive: true, onSelect: () => remove(false) },
             { label: 'A compra inteira', destructive: true, onSelect: () => remove(true) }]
          : [{ label: 'Excluir', destructive: true, onSelect: () => remove(false) }]} />
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
        ...(t.type === 'expense' && { sourceData: { ...(t.sourceData ?? {}), items } }),
        ...(t.type === 'income' ? { description: text.trim() || null } : { place: text.trim() || null }),
      })
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

      {showCategory && editable && (
        <ListGroup header="Categoria">
          <li className="flex flex-wrap gap-2 p-3">
            {categories.filter(c => c.type === catType).map(c => (
              <ChoiceChip key={c.id} selected={categoryId === c.id} onClick={() => setCategoryId(c.id)} className="pl-1">
                <TokenIcon active={categoryId === c.id} icon={c.icon} color={c.color} size="sm" />{c.name}
              </ChoiceChip>
            ))}
          </li>
        </ListGroup>
      )}

      {showWallet && editable && !t.installmentGroupId && (
        <ListGroup header="Carteira">
          <li className="flex flex-wrap gap-2 p-3">
            {wallets.map(w => (
              <ChoiceChip key={w.id} selected={walletId === w.id} onClick={() => setWalletId(w.id)} className="pl-1">
                <TokenIcon active={walletId === w.id} icon={WALLET_TYPE_ICON[w.type] ?? 'wallet'} color="gray" size="sm" />
                {w.ownerName ? `${w.name}, de ${w.ownerName}` : w.name}
              </ChoiceChip>
            ))}
          </li>
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
