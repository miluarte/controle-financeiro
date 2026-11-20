'use client'

import { useState } from 'react'
import { CloseLinearIcon } from '@solar-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetClose, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { FormRow } from '@/components/ios/form-row'
import { GlassButton } from '@/components/ios/glass-button'
import { ListGroup } from '@/components/ios/list-group'
import { SegmentedControl } from '@/components/ios/segmented-control'
import { CurrencyInput } from '@/components/shared/currency-input'
import { NumberField } from '@/components/shared/number-field'
import { useCategories } from '@/hooks/use-categories'
import { useProfile } from '@/hooks/use-profile'
import { useRefresh } from '@/hooks/use-refresh'
import { useWallets } from '@/hooks/use-wallets'
import { transactionsApi } from '@/lib/api/transactions'
import { uploadReceipt, walletForReceipt, type ReceiptResult } from '@/lib/receipt'
import { ReceiptResultGroup } from '@/components/receipt/receipt-result-group'
import { ReceiptScanButton } from '@/components/receipt/receipt-scan-button'
import { useSession } from '@/hooks/use-session'
import type { Transaction } from '@/lib/types'
import { todayIso } from '@/lib/utils'
import { DateField } from '@/components/shared/date-field'
import { InstallmentProgress } from './installment-progress'
import { ItemsEditor } from './items-editor'
import { LoadingDots } from '@/components/shared/loading-dots'
import { RepeatGroup, repeatDefault, repeatLastMonth } from './repeat-group'
import { billsApi } from '@/lib/api/bills'
import { PurchaseOwnerField, useCardAccess } from './purchase-owner-field'
import { familyApi } from '@/lib/api/family'
import type { ReceiptItem } from '@/lib/receipt'
import { useCategorySuggest } from '@/hooks/use-category-suggest'
import { automationsApi } from '@/lib/api/automations'
import { useConfirmDelete } from '@/components/ios/use-delete-action'
import { cardHolders, holderFooter, HolderPicker } from './holder-picker'
import { CategoryField } from '@/components/shared/category-field'
import { PickerRow } from '@/components/shared/picker-row'
import { walletOption } from '@/components/shared/wallet-picker'

const UNKNOWN_CARD = '__sem-cartao'

export type QuickAddMode = 'expense' | 'income' | 'save'
type Mode = QuickAddMode
type SaveDirection = 'apply' | 'redeem'

// 5.3: registro rápido de Gasto, Receita e Guardar. Abre pelo + da barra de abas (AddMenu).
interface QuickAddSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialMode?: Mode
  // gasto pendente das automações: abre preenchido e, ao registrar, substitui o pendente
  pending?: Transaction | null
  // foto da nota já escolhida no botão +: abre lendo a nota
  initialReceipt?: File | null
  // "Conta fixa" do botão +: o mesmo formulário com "Repetir todo mês" já ligado
  initialRepeat?: boolean
}

const pendingItems = (t: Transaction | null | undefined): ReceiptItem[] =>
  Array.isArray(t?.sourceData?.items) ? (t.sourceData.items as ReceiptItem[]) : []

// número guardado no pendente sem cartão (parcelas), com valor padrão
const pendingNumber = (t: Transaction | null | undefined, key: string, fallback: number) =>
  typeof t?.sourceData?.[key] === 'number' ? (t.sourceData[key] as number) : fallback

export function QuickAddSheet({ open, onOpenChange, initialMode = 'expense', pending = null, initialReceipt = null, initialRepeat = false }: QuickAddSheetProps) {
  const { categories } = useCategories()
  const { wallets } = useWallets()
  const { profile } = useProfile()
  const refreshMonth = useRefresh()
  const { session } = useSession()
  const suggest = useCategorySuggest()

  const [mode, setMode] = useState<Mode>(initialMode)
  const [saveDirection, setSaveDirection] = useState<SaveDirection>('apply')
  const [amount, setAmount] = useState(pending?.amount ?? 0)
  const [date, setDate] = useState(() => pending?.date ?? todayIso())
  const [categoryId, setCategoryId] = useState<string | null>(() => pending ? pending.categoryId ?? suggest(pending.place) : null)
  // null = ainda não escolheu: usa a carteira padrão do perfil
  const [pickedWalletId, setWalletId] = useState<string | null>(pending?.walletId ?? null)
  const [place, setPlace] = useState(pending?.place ?? '')
  const [installments, setInstallments] = useState(() => pendingNumber(pending, 'installments', 1))
  // compra parcelada que já estava andando antes do app: parcela atual e valor da parcela
  const [currentInstallment, setCurrentInstallment] = useState(() => pendingNumber(pending, 'current_installment', 1))
  const [amountIsInstallment, setAmountIsInstallment] = useState(pending?.sourceData?.amount_is_installment === true)
  // "Não lembro o cartão": fica pendente com o titular, até alguém escolher o cartão
  const [cardUnknown, setCardUnknown] = useState(!!pending?.holderId)
  const [holderId, setHolderId] = useState<string | null>(pending?.holderId ?? null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // leitura da nota fiscal (5.4)
  const [receipt, setReceipt] = useState<{ result: ReceiptResult; image: Blob } | null>(null)
  const [attachReceipt, setAttachReceipt] = useState(false)
  // mesma NFC-e já registrada antes (pela chave do QR code)
  const [duplicateOn, setDuplicateOn] = useState<string | null>(null)
  // itens da compra: vêm da nota ou são digitados
  const [items, setItems] = useState<ReceiptItem[]>(() => pendingItems(pending))
  const discard = useConfirmDelete()
  // cartão próprio compartilhado: de quem é a compra ('' = sua)
  const [owner, setOwner] = useState('')
  // receita que repete todo mês vira receita fixa (Contas, "A receber")
  const [repeat, setRepeat] = useState(() => ({ ...repeatDefault(todayIso().slice(0, 7)), on: initialRepeat }))

  function onReceipt(result: ReceiptResult, image: Blob) {
    setReceipt({ result, image })
    setDuplicateOn(null)
    if (result.chave) transactionsApi.findByChave(result.chave).then(setDuplicateOn).catch(() => {})
    if (result.amount) setAmount(result.amount)
    if (result.place) setPlace(result.place)
    if (result.date) setDate(result.date)
    // categoria: a da leitura, senão a do seu histórico/palavras-chave (sem IA)
    const cat = result.categoryId ?? suggest(result.place, result.items)
    if (cat) setCategoryId(cat)
    if (result.items.length) setItems(result.items)
    // forma de pagamento da nota: final do cartão ou tipo (crédito, débito, Pix, dinheiro)
    const wallet = walletForReceipt(wallets, result)
    if (wallet) setWalletId(wallet)
    // compra parcelada na nota: o total da nota é o valor da compra inteira
    if (result.installments > 1) { setInstallments(result.installments); setAmountIsInstallment(false) }
  }

  function reset() {
    setAmount(0)
    setDate(todayIso())
    setCategoryId(null)
    setPlace('')
    setInstallments(1)
    setCurrentInstallment(1)
    setAmountIsInstallment(false)
    setCardUnknown(false)
    setHolderId(null)
    setError(null)
    setWalletId(null)
    setReceipt(null)
    setAttachReceipt(false)
    setDuplicateOn(null)
    setItems([])
    setOwner('')
    setRepeat(repeatDefault(todayIso().slice(0, 7)))
  }

  function changeMode(next: Mode) {
    setMode(next)
    setCategoryId(null)
    setError(null)
  }

  const visibleCategories = categories.filter(c => c.type === (mode === 'income' ? 'income' : 'expense'))
  const unknownCard = mode === 'expense' && cardUnknown
  // gasto "Repetir todo mês": só à vista e com a carteira escolhida
  const repeatExpense = mode === 'expense' && repeat.on && !cardUnknown && installments <= 1
  const walletId = unknownCard ? null : pickedWalletId ?? profile?.defaultWalletId ?? null
  const wallet = wallets.find(w => w.id === walletId)
  const isCredit = mode === 'expense' && wallet?.type === 'credit'
  // parcelas valem no crédito e também quando o cartão ainda não foi escolhido
  const creditLike = isCredit || unknownCard
  const needsCategory = mode !== 'save'
  const needsWallet = mode !== 'income'
  const access = useCardAccess(isCredit ? walletId : null)
  const assignTo = access.people.some(p => p.userId === owner) && owner !== access.me ? owner : null
  // titulares possíveis: eu (se tenho cartão de crédito) e quem compartilha cartão comigo
  const me = session?.user.id ?? ''
  const holders = cardHolders(wallets, me)
  const holder = holderId ?? (holders.length === 1 ? holders[0].id : null)
  const hasWallet = unknownCard ? !!holder : !!walletId
  const canSubmit = amount > 0 && (!needsCategory || !!categoryId) && (!needsWallet || hasWallet) && !submitting

  function pickWallet(id: string) {
    setCardUnknown(false)
    setWalletId(id)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const placeValue = place.trim() || null
      if (mode === 'income' && repeat.on) {
        await createRecurringIncome(placeValue)
      } else if (mode === 'expense' && repeatExpense) {
        await createRecurringExpense(placeValue)
      } else if (unknownCard) {
        await createWithoutCard(placeValue)
      } else if (isCredit && installments > 1) {
        const group = await transactionsApi.createInstallments({
          walletId: walletId!, categoryId, installments, firstDate: date, place: placeValue,
          total: amountIsInstallment ? amount * installments : amount,
          start: Math.min(currentInstallment, installments),
          ...(pending ? { source: pending.source } : {}),
        })
        if (items.length) await transactionsApi.setGroupItems(group, items)
        if (assignTo) {
          // assign_purchase vale para todas as parcelas em aberto da compra
          const [first] = await transactionsApi.idsOfGroup(group)
          if (first) await familyApi.assignPurchase(first, assignTo)
        }
      } else {
        const fromPhoto = mode === 'expense' && receipt
        const receiptPath = fromPhoto && attachReceipt && session ? await uploadReceipt(session.user.id, receipt.image) : null
        const created = await transactionsApi.create({
          ...(fromPhoto ? {
            source: 'photo',
            sourceData: { reader: receipt.result.source, items, ...(receipt.result.chave ? { chave: receipt.result.chave } : {}) },
            receiptPath,
          } : pending ? {
            source: pending.source,
            sourceData: { ...(pending.sourceData ?? {}), ...(mode === 'expense' && items.length ? { items } : {}) },
          } : mode === 'expense' && items.length ? { sourceData: { items } } : {}),
          type: mode === 'save' ? (saveDirection === 'apply' ? 'save_apply' : 'save_redeem') : mode,
          amount,
          date,
          categoryId: mode === 'save' ? null : categoryId,
          walletId: needsWallet ? walletId : null,
          place: mode === 'income' ? null : placeValue,
          description: mode === 'income' ? placeValue : null,
        })
        if (assignTo && isCredit) await familyApi.assignPurchase(created.id, assignTo)
      }
      if (pending) await finishPending(pending)
      await refreshMonth()
      reset()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível registrar.')
    } finally {
      setSubmitting(false)
    }
  }

  // compra sem cartão: pendente, com o titular e as parcelas guardadas para quando escolherem o cartão
  async function createWithoutCard(placeValue: string | null) {
    const fromPhoto = receipt
    const receiptPath = fromPhoto && attachReceipt && session ? await uploadReceipt(session.user.id, receipt.image) : null
    await transactionsApi.create({
      type: 'expense', amount, date, categoryId, walletId: null, place: placeValue, description: null,
      status: 'pending', holderId: holder,
      source: fromPhoto ? 'photo' : pending?.source ?? 'manual',
      receiptPath,
      sourceData: {
        ...(pending?.sourceData ?? {}),
        ...(fromPhoto ? { reader: receipt.result.source, ...(receipt.result.chave ? { chave: receipt.result.chave } : {}) } : {}),
        ...(items.length ? { items } : {}),
        card_unknown: true,
        installments,
        current_installment: Math.min(currentInstallment, installments),
        amount_is_installment: amountIsInstallment,
      },
    })
  }

  // o lançamento novo substitui o pendente; no Apple Pay, guarda o nome do cartão como apelido da carteira
  async function finishPending(t: Transaction) {
    await transactionsApi.remove(t.id)
    const card = typeof t.sourceData?.card === 'string' ? t.sourceData.card : null
    if (card && walletId && needsWallet) await automationsApi.rememberCard(t.owner, card, walletId)
  }

  // gasto que repete todo mês vira conta fixa: no cartão de crédito, entra sozinho na fatura (bills.wallet_id);
  // em Pix/débito/dinheiro, é conta a pagar. Se a data já chegou, este mês já entra lançado.
  async function createRecurringExpense(name: string | null) {
    const start = date.slice(0, 7)
    const last = repeatLastMonth(repeat, start)
    const billId = await billsApi.create({
      type: 'expense', name: name ?? categories.find(c => c.id === categoryId)?.name ?? 'Conta',
      amount, dueDay: Number(date.slice(8, 10)), dueNextMonth: false, categoryId, recurring: true,
      startMonth: `${start}-01`, installmentCurrent: null, installmentsTotal: null,
      endMonth: last ? `${last}-01` : null, walletId: isCredit ? walletId : null,
    })
    // o cartão é lançado sozinho ao gerar o mês; nas outras carteiras, paga a ocorrência se a data já chegou
    const occurrence = (await billsApi.getMonth(start)).find(o => o.billId === billId)
    if (!isCredit && occurrence && date <= todayIso() && walletId) await billsApi.pay(occurrence.id, walletId, date)
  }

  // cria a receita fixa com dia e mês da data; se a data já chegou, este mês já entra como recebido
  async function createRecurringIncome(name: string | null) {
    const start = date.slice(0, 7)
    const last = repeatLastMonth(repeat, start)
    const billId = await billsApi.create({
      type: 'income', name: name ?? categories.find(c => c.id === categoryId)?.name ?? 'Receita',
      amount, dueDay: Number(date.slice(8, 10)), dueNextMonth: false, categoryId, recurring: true,
      startMonth: `${start}-01`, installmentCurrent: null, installmentsTotal: null,
      endMonth: last ? `${last}-01` : null,
    })
    if (date <= todayIso()) {
      const occurrence = (await billsApi.getMonth(start)).find(o => o.billId === billId)
      if (occurrence) await billsApi.pay(occurrence.id, null, date)
    }
  }

  const walletQuestion = mode === 'save' ? (saveDirection === 'apply' ? 'Saiu de' : 'Voltou para') : 'Pagamento'
  const placeLabel = mode === 'income' ? 'Descrição' : mode === 'save' ? 'Onde?' : 'Onde foi?'
  const placePlaceholder = mode === 'income' ? (repeat.on ? 'Salário, aluguel…' : 'Opcional') : mode === 'save' ? 'CDB, Tesouro' : 'Opcional'

  const modeTitle = pending ? 'Confirmar gasto'
    : mode === 'expense' ? (repeat.on ? 'Nova conta fixa' : 'Novo gasto')
    : mode === 'income' ? (repeat.on ? 'Nova receita fixa' : 'Nova receita') : 'Guardar'
  const submitLabel = pending ? 'Confirmar' : 'Registrar'

  function askDiscard(t: Transaction) {
    discard.ask({
      title: 'Descartar este gasto?', label: 'Descartar',
      remove: async () => { await transactionsApi.remove(t.id); reset(); onOpenChange(false) },
    })
  }

  return (
    <>
    {discard.sheet}
    <Sheet open={open} onOpenChange={o => { onOpenChange(o); if (!o) reset() }}>
      <SheetContent side="bottom" showCloseButton={false} className="gap-0">
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          {/* barra do modal no iOS 26: fechar (vidro) | título | confirmar (cápsula preenchida) */}
          <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center px-3 pt-1 pb-2">
            <SheetClose render={<GlassButton type="button" aria-label="Cancelar" className="justify-self-start" />}>
              <CloseLinearIcon />
            </SheetClose>
            <SheetTitle className="text-headline font-semibold">{modeTitle}</SheetTitle>
            {pending ? (
              <Button type="button" variant="plain-destructive" size="nav" className="justify-self-end" onClick={() => askDiscard(pending)}>
                Descartar
              </Button>
            ) : (
              <GlassButton type="submit" size="capsule" tone="prominent" className="justify-self-end font-semibold" disabled={!canSubmit}>
                {submitting ? <LoadingDots size="sm" tone="current" label="Salvando" /> : submitLabel}
              </GlassButton>
            )}
          </div>

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 pt-2 pb-6">
            <SegmentedControl
              aria-label="Tipo de registro"
              value={mode}
              onChange={changeMode}
              options={[
                { value: 'expense', label: 'Gasto' },
                { value: 'income', label: 'Receita' },
                { value: 'save', label: 'Guardar' },
              ]}
            />

            {mode === 'save' && (
              <SegmentedControl
                aria-label="Aplicar ou resgatar"
                value={saveDirection}
                onChange={setSaveDirection}
                options={[
                  { value: 'apply', label: 'Aplicar' },
                  { value: 'redeem', label: 'Resgatar' },
                ]}
              />
            )}

            {mode === 'expense' && <ReceiptScanButton onRead={onReceipt} initialFile={initialReceipt} />}

            <CurrencyInput
              id="amount"
              aria-label="Valor"
              variant="display"
              value={amount}
              onChange={setAmount}
            />

            <ListGroup>
              <FormRow label={creditLike && installments > 1 ? 'Data da compra' : 'Data'} htmlFor="date">
                <DateField id="date" value={date} onChange={v => setDate(v || todayIso())} />
              </FormRow>
              <FormRow label={placeLabel} htmlFor="place">
                <Input
                  id="place"
                  variant="bare"
                  value={place}
                  onChange={e => setPlace(e.target.value)}
                  onBlur={() => { if (mode === 'expense' && !categoryId) { const cat = suggest(place, items); if (cat) setCategoryId(cat) } }}
                  placeholder={placePlaceholder}
                  className="text-right"
                />
              </FormRow>
              {creditLike && (
                <FormRow label="Parcelas" htmlFor="installments">
                  <NumberField id="installments" min={1} max={48} value={installments}
                    onChange={setInstallments} className="w-16 text-right" />
                </FormRow>
              )}
              {creditLike && installments > 1 && (
                <InstallmentProgress installments={installments} current={currentInstallment} onCurrentChange={setCurrentInstallment}
                  amountIsInstallment={amountIsInstallment} onAmountIsInstallmentChange={setAmountIsInstallment}
                  purchaseDate={date} />
              )}
            </ListGroup>

            {mode === 'income' && (
              <RepeatGroup value={repeat} onChange={setRepeat} start={date.slice(0, 7)} lastLabel="último recebimento" />
            )}
            {mode === 'expense' && !unknownCard && installments <= 1 && (
              <RepeatGroup value={repeat} onChange={setRepeat} start={date.slice(0, 7)}
                lastLabel={isCredit ? 'último lançamento no cartão' : 'último pagamento'} />
            )}

            {mode === 'expense' && receipt && (
              <ReceiptResultGroup source={receipt.result.source} items={[]} duplicateOn={duplicateOn}
                attach={attachReceipt} onAttachChange={setAttachReceipt} attachDisabled={creditLike && installments > 1} />
            )}

            {(needsCategory || needsWallet) && (
              <ListGroup footer={unknownCard ? holderFooter(holders, holder, me) : undefined}>
                {needsCategory && <CategoryField id="qa-category" categories={visibleCategories} value={categoryId} onChange={setCategoryId} />}
                {needsWallet && (
                  <PickerRow id="qa-wallet" label={walletQuestion}
                    value={unknownCard ? UNKNOWN_CARD : walletId}
                    onChange={v => { if (v === UNKNOWN_CARD) setCardUnknown(true); else if (v) pickWallet(v) }}
                    options={[
                      ...wallets.filter(w => mode !== 'save' || w.type !== 'credit').map(walletOption),
                      ...(mode === 'expense' && holders.length > 0 ? [{ value: UNKNOWN_CARD, label: 'Não lembro o cartão', icon: 'credit-card' }] : []),
                    ]} />
                )}
                {unknownCard && <HolderPicker holders={holders} value={holder} onChange={setHolderId} me={me} />}
              </ListGroup>
            )}

            {isCredit && !unknownCard && <PurchaseOwnerField people={access.people} me={access.me} value={owner} onChange={setOwner} />}

            {mode === 'expense' && <ItemsEditor items={items} onChange={setItems} total={amount} />}

            {error && <p className="px-4 text-footnote text-destructive">{error}</p>}

            <Button type="submit" size="lg" className="w-full" disabled={!canSubmit}>
              {submitting ? <LoadingDots tone="current" label="Registrando" /> : submitLabel}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
    </>
  )
}
