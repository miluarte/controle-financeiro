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
import { usePinAction } from './use-pin-action'
import { Switch } from '@/components/ui/switch'
import { feedback } from '@/lib/feedback'
import { useCardPeople } from '@/hooks/use-card-people'
import { SPLIT_ALL } from '@/lib/split'
import { ListRow } from '@/components/ios/list-row'
import { capitalize, cn, formatCurrency, monthName } from '@/lib/utils'

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
  const pin = usePinAction()
  const [amount, setAmount] = useState(t.amount)
  const [date, setDate] = useState(t.date)
  const [categoryId, setCategoryId] = useState(t.categoryId)
  const [walletId, setWalletId] = useState(t.walletId)
  const [text, setText] = useState(t.type === 'income' ? t.description ?? '' : t.place ?? '')
  const [items, setItems] = useState<ReceiptItem[]>((t.sourceData?.items as ReceiptItem[] | undefined) ?? [])
  const [error, setError] = useState<string | null>(null)
  const [, setBusy] = useState(false)

  const editable = ['expense', 'income', 'save_apply', 'save_redeem'].includes(t.type)
  // compra dividida (split_purchase): divisão da compra inteira por pessoa
  const { nameOf } = useCardPeople()
  const split = Array.isArray(t.sourceData?.split_parts) ? (t.sourceData.split_parts as { user_id: string; amount: number }[]) : null
  const splitTotal = split ? split.reduce((sum, p) => sum + Number(p.amount), 0) : 0
  const n = t.installmentsTotal ?? 1
  // divisão de cada parcela (split_schedule), mês a mês
  const schedule = Array.isArray(t.sourceData?.split_schedule)
    ? (t.sourceData.split_schedule as { n: number | null; date: string; parts: { user_id: string; amount: number }[] }[])
    : null
  // parcela: a desta compra é exata (sua parte e o total da parcela antes de dividir); a de outra pessoa, aproximada
  const parcelOf = (userId: string | null, total: number) =>
    userId === t.owner ? t.amount
      : userId === null && typeof t.sourceData?.split_total === 'number' ? (t.sourceData.split_total as number)
      : Math.round(total / n)
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
      await refresh(); onDone(); feedback.done('Salvo')
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


      {pin.sheet}
      {pin.can(t) && (
        <ListGroup footer={pin.pinned(t) ? 'Repete todo mês até você desligar.' : undefined}>
          <FormRow label="Conta fixa">
            <Switch checked={pin.pinned(t)}
              onCheckedChange={on => { if (on) pin.pin(t).then(onDone); else pin.askUnpin(t) }} />
          </FormRow>
        </ListGroup>
      )}

      {/* compra dividida: todos os itens, com o dono de cada um, e quanto fica para cada pessoa */}
      {t.type === 'expense' && (split ? (
        <>
          <ItemsEditor items={items} onChange={setItems} total={splitTotal} disabled
            ownerName={o => (o === SPLIT_ALL ? 'Dividido' : nameOf(o ?? t.owner))} />
          {/* total da compra e de cada pessoa; na parcelada, também a parcela de cada um */}
          <ListGroup header="Divisão">
            <ListRow title="Total da compra"
              subtitle={n > 1 ? `${n}x de ${formatCurrency(parcelOf(null, splitTotal))}` : undefined}
              trailing={<span className="text-body font-semibold tabular-nums text-foreground">{formatCurrency(splitTotal)}</span>} />
            {split.map(p => (
              <ListRow key={p.user_id} title={nameOf(p.user_id)}
                subtitle={n > 1 ? `${n}x de ${formatCurrency(parcelOf(p.user_id, p.amount))}` : undefined}
                trailing={<span className="text-body tabular-nums text-foreground">{formatCurrency(p.amount)}</span>} />
            ))}
          </ListGroup>
          {/* mês a mês: quanto cada pessoa paga em cada parcela (a parcela desta tela em destaque) */}
          {schedule && schedule.length > 1 && (
            <ListGroup header="Por mês">
              {schedule.map(m => (
                <ListRow key={m.n ?? 0}
                  title={<span className={cn(m.n === t.installmentN && 'font-semibold')}>{`${m.n} de ${n} · ${capitalize(monthName(m.date.slice(0, 7), 'short'))} ${m.date.slice(0, 4)}`}</span>}
                  subtitle={m.parts.map(p => `${nameOf(p.user_id)} ${formatCurrency(Number(p.amount))}`).join(' · ')}
                  trailing={<span className="text-body tabular-nums text-foreground">{formatCurrency(m.parts.reduce((sum, p) => sum + Number(p.amount), 0))}</span>} />
              ))}
            </ListGroup>
          )}
        </>
      ) : <ItemsEditor items={items} onChange={setItems} total={amount} disabled={!editable} />)}

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
