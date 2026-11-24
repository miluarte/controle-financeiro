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
import { SettlePurchaseGroup } from '@/components/cards/settle-purchase-group'
import { useTransactionDelete } from './use-transaction-delete'
import { usePinAction } from './use-pin-action'
import { Switch } from '@/components/ui/switch'
import { feedback } from '@/lib/feedback'
import { useCardPeople } from '@/hooks/use-card-people'
import { SenderRows, senderData, senderOf, type Sender } from './sender-field'
import { SPLIT_ALL } from '@/lib/split'
import { ListRow } from '@/components/ios/list-row'
import { capitalize, cn, formatCurrency, monthName } from '@/lib/utils'
import posthog from 'posthog-js'

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
  // parte de Pix dividido: valor, data e carteira só mudam excluindo o Pix e registrando de novo
  const shared = !!t.sharedPaymentId
  const sharedParts = Array.isArray(t.sourceData?.shared_parts) ? (t.sourceData.shared_parts as { user_id: string; amount: number }[]) : []
  // compra dividida (split_purchase): divisão da compra inteira por pessoa
  const { nameOf, people, me } = useCardPeople()
  const [sender, setSender] = useState<Sender | null>(() => senderOf(t.sourceData))
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
  const familyCard = wallets.find(w => w.id === t.walletId && w.type === 'credit' && !!w.ownerName)
  const catType = t.type === 'income' ? 'income' : 'expense'
  const showCategory = t.type === 'expense' || t.type === 'income'
  const showWallet = t.type !== 'income'
  // gasto no Pix: para quem foi (Destinatário); receita: quem enviou (Remetente)
  const isPix = t.type === 'expense' && wallets.find(w => w.id === walletId)?.type === 'pix'
  const withSender = (data: Record<string, unknown> | null) => ({
    ...Object.fromEntries(Object.entries(data ?? {}).filter(([k]) => k !== 'sender')),
    ...(t.type === 'income' || isPix ? senderData(sender) : {}),
  })

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!editable || amount <= 0) return
    setBusy(true); setError(null)
    try {
      await transactionsApi.update(t.id, {
        amount, date, categoryId, walletId,
        ...(t.type === 'expense' && !t.installmentGroupId && { sourceData: { ...withSender(t.sourceData), items } }),
        ...(t.type === 'income' ? { description: text.trim() || null } : { place: text.trim() || null }),
        ...(t.type === 'income' && { sourceData: withSender(t.sourceData) }),
      })
      if (t.type === 'expense' && t.installmentGroupId) await transactionsApi.setGroupItems(t.installmentGroupId, items)
      await refresh()
      posthog.capture('transaction_updated', {
        transaction_type: t.type,
        is_installment: Boolean(t.installmentGroupId),
        has_items: items.length > 0,
      })
      onDone(); feedback.done('Salvo')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.')
    } finally { setBusy(false) }
  }

  return (
    <form id="edit-transaction" onSubmit={save} className="space-y-6">
      <CurrencyInput id="edit-amount" aria-label="Valor" variant="display" value={amount} onChange={setAmount} disabled={!editable || shared} />

      <ListGroup footer={t.installmentN ? `Parcela ${t.installmentN} de ${t.installmentsTotal}` : undefined}>
        <FormRow label="Data" htmlFor="edit-date">
          <DateField id="edit-date" value={date} disabled={!editable || shared} onChange={v => setDate(v || t.date)} />
        </FormRow>
        <FormRow label={t.type === 'income' ? 'Descrição' : 'Onde?'} htmlFor="edit-text">
          <Input id="edit-text" variant="bare" value={text} onChange={e => setText(e.target.value)}
            placeholder="Opcional" className="text-right" disabled={!editable} />
        </FormRow>
        {(t.type === 'income' || isPix) && editable && (
          <SenderRows id="edit-sender" label={t.type === 'income' ? 'Remetente' : 'Destinatário'} value={sender} onChange={setSender} people={people} me={me} />
        )}
      </ListGroup>

      {((showCategory && editable) || (showWallet && editable && !t.installmentGroupId && !shared)) && (
        <ListGroup>
          {showCategory && editable && (
            <CategoryField id="edit-category" categories={categories.filter(c => c.type === catType)} value={categoryId}
              onChange={id => id && setCategoryId(id)} />
          )}
          {showWallet && editable && !t.installmentGroupId && !shared && (
            <WalletPicker id="edit-wallet" wallets={wallets} value={walletId} onChange={setWalletId} />
          )}
        </ListGroup>
      )}


      {/* gasto dividido (Pix, débito, dinheiro): quem pagou e a parte de cada pessoa */}
      {shared && (
        <ListGroup header="Gasto dividido" footer="Para mudar valor ou pessoas, exclua e registre de novo.">
          <ListRow title="Quem pagou" trailing={<span className="text-body text-foreground">{t.paidBy ? nameOf(t.paidBy) : 'Você'}</span>} />
          {sharedParts.map(p => (
            <ListRow key={p.user_id} title={nameOf(p.user_id)}
              trailing={<span className="text-body tabular-nums text-foreground">{formatCurrency(Number(p.amount))}</span>} />
          ))}
          {typeof t.sourceData?.shared_total === 'number' && (
            <ListRow title="Total do Pix"
              trailing={<span className="text-body font-semibold tabular-nums text-foreground">{formatCurrency(t.sourceData.shared_total as number)}</span>} />
          )}
        </ListGroup>
      )}

      {pin.sheet}
      {pin.can(t) && (
        <ListGroup footer={pin.pinned(t) ? 'Repete todo mês até você desligar.' : undefined}>
          <FormRow label="Gasto fixo">
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

      {/* compra minha no cartão de outra pessoa da família: informar o acerto daqui */}
      {t.type === 'expense' && t.invoiceRef && t.owner === me && familyCard && (
        <SettlePurchaseGroup t={t} card={familyCard} />
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
