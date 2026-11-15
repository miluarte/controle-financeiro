'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormRow } from '@/components/ios/form-row'
import { ListGroup } from '@/components/ios/list-group'
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

// TRA-6: abrir, editar e excluir um lançamento.
export function TransactionEditSheet({
  transaction, onClose,
}: { transaction: Transaction | null; onClose: () => void }) {
  return (
    <ModalSheet
      open={!!transaction}
      onOpenChange={o => { if (!o) onClose() }}
      title={transaction ? TYPE_LABEL[transaction.type] : ''}
      formId="edit-transaction"
      actionLabel="Salvar"
    >
      {transaction && <EditForm key={transaction.id} t={transaction} onDone={onClose} />}
    </ModalSheet>
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
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

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
        ...(t.type === 'income' ? { description: text.trim() || null } : { place: text.trim() || null }),
      })
      await refresh(); onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.')
    } finally { setBusy(false) }
  }

  async function remove(all: boolean) {
    const msg = all ? 'Excluir todas as parcelas desta compra?' : 'Excluir este lançamento?'
    if (!confirm(msg)) return
    setBusy(true); setError(null)
    try {
      if (all && t.installmentGroupId) await transactionsApi.removeInstallmentGroup(t.installmentGroupId)
      else await transactionsApi.remove(t.id)
      await refresh(); onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível excluir.')
    } finally { setBusy(false) }
  }

  return (
    <form id="edit-transaction" onSubmit={save} className="space-y-6">
      <CurrencyInput id="edit-amount" aria-label="Valor" variant="display" value={amount} onChange={setAmount} disabled={!editable} />

      <ListGroup footer={t.installmentN ? `Parcela ${t.installmentN} de ${t.installmentsTotal}` : undefined}>
        <FormRow label="Data" htmlFor="edit-date">
          <Input id="edit-date" type="date" variant="bare" value={date} disabled={!editable}
            onChange={e => setDate(e.target.value || t.date)} className="w-auto text-right" />
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

      {error && <p className="px-4 text-footnote text-destructive">{error}</p>}

      <div className="space-y-2">
        <Button type="button" variant="destructive" size="lg" className="w-full" disabled={busy} onClick={() => remove(false)}>
          {t.installmentGroupId ? 'Excluir esta parcela' : 'Excluir lançamento'}
        </Button>
        {t.installmentGroupId && (
          <Button type="button" variant="ghost" size="lg" className="w-full text-destructive" disabled={busy} onClick={() => remove(true)}>
            Excluir a compra inteira
          </Button>
        )}
      </div>
    </form>
  )
}
