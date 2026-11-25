'use client'

import { useState } from 'react'
import useSWR from 'swr'
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
import { categoriesApi } from '@/lib/api/categories'
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
import { SenderRows, senderData, senderOf, type Sender } from './sender-field'
import { SPLIT_ALL } from '@/lib/split'
import { ListRow } from '@/components/ios/list-row'
import { capitalize, cn, formatCurrency, monthName } from '@/lib/utils'
import posthog from 'posthog-js'
import { discountData, discountError, discountOf, discountValueOf, discountAmount } from '@/lib/discount'
import { DiscountGroup, DiscountSummary } from './discount-group'
import { Money } from '@/components/shared/money'
import { FormError } from '@/components/shared/form-error'

// TRA-6: abrir, editar e excluir um lançamento.
// onAssign: titular de cartão compartilhado troca de quem é a compra (linha "De quem é").
export function TransactionEditSheet({
  transaction, onClose, onAssign,
}: { transaction: Transaction | null; onClose: () => void; onAssign?: (t: Transaction) => void }) {
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
        {t && <EditForm key={t.id} t={t} onDone={onClose} onAssign={onAssign} />}
      </ModalSheet>
      {del.sheet}
    </>
  )
}

function EditForm({ t, onDone, onAssign }: { t: Transaction; onDone: () => void; onAssign?: (t: Transaction) => void }) {
  const { categories } = useCategories()
  const { wallets } = useWallets()
  const refresh = useRefresh()
  const pin = usePinAction()
  // desconto guardado: na compra simples, o valor editado é o sem desconto
  const savedDiscount = discountOf(t.sourceData)
  const [discount, setDiscount] = useState(() => discountValueOf(savedDiscount))
  const [amount, setAmount] = useState(t.amount)
  const [gross, setGross] = useState(savedDiscount ? savedDiscount.gross : t.amount)
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
  const splitSaved = Array.isArray(t.sourceData?.split_parts) ? (t.sourceData.split_parts as { user_id: string; amount: number }[]) : null
  const n = t.installmentsTotal ?? 1
  // parcela desta compra dividida: valor de cada pessoa, editável (ex.: corrigir um centavo)
  const root = typeof t.sourceData?.split_of === 'string' ? t.sourceData.split_of : t.id
  const { data: parcelParts } = useSWR(splitSaved ? ['split-parts', root] : null, () => transactionsApi.splitParts(root))
  // só os valores alterados; os demais vêm do banco
  const [partAmounts, setPartAmounts] = useState<Record<string, number>>({})
  const parcelTotal = parcelParts ? parcelParts.reduce((sum, p) => sum + (partAmounts[p.id] ?? p.amount), 0) : null
  // diferença por pessoa do que foi alterado e ainda não salvo; a Divisão já mostra o valor novo
  const delta: Record<string, number> = {}
  for (const p of parcelParts ?? []) delta[p.owner] = (delta[p.owner] ?? 0) + (partAmounts[p.id] ?? p.amount) - p.amount
  const withDelta = (parts: { user_id: string; amount: number }[]) =>
    parts.map(p => ({ ...p, amount: Number(p.amount) + (delta[p.user_id] ?? 0) }))
  const split = splitSaved ? withDelta(splitSaved) : null
  const splitTotal = split ? split.reduce((sum, p) => sum + p.amount, 0) : 0
  // divisão de cada parcela (split_schedule), mês a mês
  const schedule = Array.isArray(t.sourceData?.split_schedule)
    ? (t.sourceData.split_schedule as { n: number | null; date: string; parts: { user_id: string; amount: number }[] }[])
        .map(m => (m.n === t.installmentN ? { ...m, parts: withDelta(m.parts) } : m))
    : null
  // parcela: a desta compra é exata (sua parte e o total da parcela antes de dividir); a de outra pessoa, aproximada
  const parcelOf = (userId: string | null, total: number) =>
    userId === t.owner ? t.amount
      : userId === null && typeof t.sourceData?.split_total === 'number' ? (t.sourceData.split_total as number)
      : Math.round(total / n)
  // "3x de R$ 30,00" ou, com parcelas diferentes, "1x de R$ 31,40 + 2x de R$ 30,00" (pela divisão mês a mês)
  const parcelsText = (userId: string | null, total: number) => {
    const values = schedule && schedule.length === n
      ? schedule.map(m => m.parts.filter(p => userId === null || p.user_id === userId).reduce((sum, p) => sum + Number(p.amount), 0))
      : null
    if (!values) return `${n}x de ${formatCurrency(parcelOf(userId, total))}`
    const runs: { v: number; k: number }[] = []
    for (const v of values) {
      const last = runs[runs.length - 1]
      if (last && last.v === v) last.k++
      else runs.push({ v, k: 1 })
    }
    return runs.map(r => `${r.k}x de ${formatCurrency(r.v)}`).join(' + ')
  }
  // compra de outra pessoa no meu cartão: a carteira fica no cartão e a categoria sai das categorias dela
  const mine = t.owner === me
  const { data: ownerCategories } = useSWR(me && !mine ? ['member-categories', t.owner] : null, () => categoriesApi.ofMember(t.owner))
  const catType = t.type === 'income' ? 'income' : 'expense'
  const showCategory = (t.type === 'expense' || t.type === 'income') && (mine || !!ownerCategories)
  const showWallet = t.type !== 'income' && mine
  // gasto no Pix: para quem foi (Destinatário); receita: quem enviou (Remetente)
  const isPix = t.type === 'expense' && wallets.find(w => w.id === walletId)?.type === 'pix'
  // gasto avulso de uma vez só (sem parcelas, divisão ou Pix dividido): desconto editável
  const discountEditable = editable && t.type === 'expense' && !t.installmentGroupId && !shared && !split
    && (!savedDiscount || savedDiscount.gross === t.amount + savedDiscount.amount)
  const discountErr = discountEditable ? discountError(discount, gross) : null
  const saveAmount = discountEditable ? gross - discountAmount(discount, gross) : amount
  const withSender = (data: Record<string, unknown> | null) => ({
    ...Object.fromEntries(Object.entries(data ?? {}).filter(([k]) => k !== 'sender')),
    ...(t.type === 'income' || isPix ? senderData(sender) : {}),
  })

  // grava ou tira o desconto (só quando ele é editável aqui)
  function withDiscount(data: Record<string, unknown>) {
    if (!discountEditable) return data
    const rest = Object.fromEntries(Object.entries(data).filter(([k]) => k !== 'discount'))
    const d = discountData(discount, gross)
    return d ? { ...rest, discount: d } : rest
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!editable || saveAmount <= 0 || discountErr) return
    setBusy(true); setError(null)
    try {
      await transactionsApi.update(t.id, {
        amount: saveAmount, date, categoryId, walletId,
        ...(t.type === 'expense' && !t.installmentGroupId && { sourceData: withDiscount({ ...withSender(t.sourceData), items }) }),
        ...(t.type === 'income' ? { description: text.trim() || null } : { place: text.trim() || null }),
        ...(t.type === 'income' && { sourceData: withSender(t.sourceData) }),
      })
      if (t.type === 'expense' && t.installmentGroupId) await transactionsApi.setGroupItems(t.installmentGroupId, items)
      for (const p of parcelParts ?? []) {
        const v = partAmounts[p.id]
        if (v && v !== p.amount) await transactionsApi.adjustSplitPart(p.id, v)
      }
      await refresh()
      posthog.capture('transaction_updated', {
        transaction_type: t.type,
        is_installment: Boolean(t.installmentGroupId),
        has_items: items.length > 0,
        has_discount: !!discountOf(t.sourceData) || (discountEditable && discount.on),
      })
      onDone(); feedback.done('Salvo')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.')
    } finally { setBusy(false) }
  }

  return (
    <form id="edit-transaction" onSubmit={save} className="space-y-6">
      {/* compra dividida: mostra o valor da parcela inteira (soma das partes); a parte de cada um fica em Divisão */}
      <CurrencyInput id="edit-amount" aria-label="Valor" variant="display"
        value={split ? parcelTotal ?? (typeof t.sourceData?.split_total === 'number' ? (t.sourceData.split_total as number) : amount) : discountEditable ? gross : amount}
        onChange={discountEditable ? setGross : setAmount} disabled={!editable || shared || !!split} />

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
        {!split && !mine && !onAssign && (
          <ListRow title="De quem é" trailing={<span className="text-body text-foreground">{nameOf(t.owner)}</span>} />
        )}
        {!split && onAssign && (
          <ListRow title="De quem é" chevron onClick={() => onAssign(t)}
            trailing={<span className="text-body text-foreground">{nameOf(t.owner)}</span>} />
        )}
      </ListGroup>

      {((showCategory && editable) || (showWallet && editable && !t.installmentGroupId && !shared)) && (
        <ListGroup>
          {showCategory && editable && (
            <CategoryField id="edit-category" categories={(mine ? categories : ownerCategories ?? []).filter(c => c.type === catType)} value={categoryId}
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
              trailing={<Money cents={Number(p.amount)} size="rowRegular" />} />
          ))}
          {typeof t.sourceData?.shared_total === 'number' && (
            <ListRow title="Total do Pix"
              trailing={<Money cents={t.sourceData.shared_total as number} />} />
          )}
        </ListGroup>
      )}

      {discountEditable && <DiscountGroup value={discount} onChange={setDiscount} gross={gross} />}
      {/* compra parcelada, dividida ou Pix dividido: só mostra o desconto (e a parte de cada pessoa) */}
      {!discountEditable && savedDiscount && (
        <DiscountSummary discount={savedDiscount} parts={split ?? (sharedParts.length ? sharedParts : null)} nameOf={nameOf}
          installments={n} />
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
          {parcelParts && parcelParts.length > 0 && (
            <ListGroup header={n > 1 && t.installmentN ? `Parcela ${t.installmentN} de ${n}` : 'Valor de cada pessoa'}>
              {parcelParts.map(p => (
                <FormRow key={p.id} label={nameOf(p.owner)} htmlFor={`part-${p.id}`}>
                  <CurrencyInput id={`part-${p.id}`} variant="bare" className="text-right" disabled={!editable}
                    value={partAmounts[p.id] ?? p.amount} onChange={v => setPartAmounts(a => ({ ...a, [p.id]: v }))} />
                </FormRow>
              ))}
            </ListGroup>
          )}
          {/* total da compra e de cada pessoa; na parcelada, também a parcela de cada um */}
          <ListGroup header="Divisão">
            <ListRow title="Total da compra"
              subtitle={n > 1 ? parcelsText(null, splitTotal) : undefined}
              trailing={<Money cents={splitTotal} />} />
            {split.map(p => (
              <ListRow key={p.user_id} title={nameOf(p.user_id)}
                subtitle={n > 1 ? parcelsText(p.user_id, p.amount) : undefined}
                trailing={<Money cents={p.amount} size="rowRegular" />} />
            ))}
          </ListGroup>
          {/* mês a mês: quanto cada pessoa paga em cada parcela (a parcela desta tela em destaque) */}
          {schedule && schedule.length > 1 && (
            <ListGroup header="Por mês">
              {schedule.map(m => (
                <ListRow key={m.n ?? 0}
                  title={<span className={cn(m.n === t.installmentN && 'font-semibold')}>{`${m.n} de ${n} · ${capitalize(monthName(m.date.slice(0, 7), 'short'))} ${m.date.slice(0, 4)}`}</span>}
                  subtitle={m.parts.map(p => `${nameOf(p.user_id)} ${formatCurrency(Number(p.amount))}`).join(' · ')}
                  trailing={<Money cents={m.parts.reduce((sum, p) => sum + Number(p.amount), 0)} size="rowRegular" />} />
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

      <FormError message={error} />

    </form>
  )
}
