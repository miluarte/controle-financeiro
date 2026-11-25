'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
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
import { commitReceiptDraft, saveReceiptDraft, walletForReceipt, type ReceiptResult } from '@/lib/receipt'
import { ReceiptResultGroup } from '@/components/receipt/receipt-result-group'
import { ReceiptScanButton } from '@/components/receipt/receipt-scan-button'
import { useSession } from '@/hooks/use-session'
import type { BillOccurrence, Category, PurchaseInfo, Transaction } from '@/lib/types'
import { formatCurrency, todayIso } from '@/lib/utils'
import { DateField } from '@/components/shared/date-field'
import { InstallmentProgress } from './installment-progress'
import { ItemsEditor } from './items-editor'
import { SheetCloseButton } from '@/components/ios/sheet-close-button'
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
import { useCardPeople } from '@/hooks/use-card-people'
import { SPLIT_ALL, splitParts } from '@/lib/split'
import { SenderRows, senderData, senderOf, type Sender } from './sender-field'
import { PayerRow } from './payer-field'
import { sharedApi } from '@/lib/api/shared'
import { itemOwnerOptions, SplitRows, splitDefault, splitMode, splitPeople, splitSummary } from './split-group'
import { feedback } from '@/lib/feedback'
import { useBills } from '@/hooks/use-data'
import { normPlace } from '@/lib/category-suggest'
import { Switch } from '@/components/ui/switch'
import posthog from 'posthog-js'
import { useTransactionDelete } from './use-transaction-delete'
import { usePinAction } from './use-pin-action'
import { PrepayGroup } from './prepay-group'
import { SplitParcelGroups, useSplitParcel } from './split-parcel-group'
import { receiptUrl } from '@/lib/receipt'
import type { SplitValue } from './split-group'

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
  // o mesmo formulário com "Repetir todo mês" já ligado
  initialRepeat?: boolean
  // edição de um gasto fixo, receita fixa ou gasto a pagar (Contas): a série a partir do mês da ocorrência
  editBill?: BillOccurrence | null
  // edição de um lançamento: o mesmo formulário, preenchido com a compra inteira
  edit?: EditTarget | null
}

// lançamento aberto para editar: a compra inteira (purchase_info), quem edita e, na compra de outra pessoa,
// as categorias dela (categorias são de cada um)
export interface EditTarget {
  tx: Transaction
  info: PurchaseInfo
  me: string
  categories?: Category[]
}

type Part = { user_id: string; amount: number }
const partsOf = (t: Transaction | null | undefined, key: string) =>
  t && Array.isArray(t.sourceData?.[key]) ? (t.sourceData[key] as Part[]) : null

// divisão da compra em edição: por valor, com o valor de cada pessoa. A divisão guardada pode cobrir só as
// parcelas que estavam em aberto; vale como proporção do valor da compra no formulário.
function editSplit(e: EditTarget | null): SplitValue {
  const parts = partsOf(e?.tx, 'split_parts') ?? partsOf(e?.tx, 'shared_parts')
  if (!e || !parts || parts.length < 2) return splitDefault()
  const total = editAmount(e)
  const sum = parts.reduce((s, p) => s + Number(p.amount), 0)
  const values: Record<string, number> = {}
  let left = total
  parts.forEach((p, i) => {
    const v = i === parts.length - 1 ? left : sum ? Math.round(Number(p.amount) * total / sum) : 0
    values[p.user_id] = v
    left -= v
  })
  return {
    on: true, mode: 'value',
    selected: parts.map(p => p.user_id).filter(id => id !== e.me),
    values,
    withoutMe: !parts.some(p => p.user_id === e.me),
  }
}

// valor da compra em edição: gasto dividido, o total; compra parcelada ou dividida, a compra inteira
function editAmount(e: EditTarget) {
  if (e.tx.sharedPaymentId && typeof e.tx.sourceData?.shared_total === 'number') return e.tx.sourceData.shared_total as number
  return e.info.rows > 1 ? e.info.total : e.tx.amount
}

// source_data sem o que o formulário refaz (divisão, itens, destinatário)
const keptSourceData = (d: Record<string, unknown> | null | undefined) => Object.fromEntries(Object.entries(d ?? {})
  .filter(([k]) => !['split_parts', 'split_total', 'split_schedule', 'split_of', 'shared_parts', 'shared_total', 'items', 'sender'].includes(k)))

const pendingItems = (t: Transaction | null | undefined): ReceiptItem[] =>
  Array.isArray(t?.sourceData?.items) ? (t.sourceData.items as ReceiptItem[]) : []

// número guardado no pendente sem cartão (parcelas), com valor padrão
const pendingNumber = (t: Transaction | null | undefined, key: string, fallback: number) =>
  typeof t?.sourceData?.[key] === 'number' ? (t.sourceData[key] as number) : fallback

// série em edição: repete todo mês (sem parcelas) e o fim que já tem
function billRepeat(o: BillOccurrence | null | undefined, initialRepeat: boolean) {
  const base = repeatDefault(todayIso().slice(0, 7))
  if (!o) return { ...base, on: initialRepeat }
  const end = o.bill.endMonth?.slice(0, 7)
  return { ...base, on: o.bill.recurring && o.bill.installmentsTotal == null, mode: end ? 'month' as const : 'never' as const, endMonth: end ?? base.endMonth }
}

export function QuickAddSheet({ open, onOpenChange, initialMode = 'expense', pending = null, initialReceipt = null, initialRepeat = false, editBill = null, edit = null }: QuickAddSheetProps) {
  const bill = editBill?.bill ?? null
  const et = edit?.tx ?? null
  // lançamento em edição ou pendente: de onde vêm a origem e os dados guardados ao registrar de novo
  const origin = pending ?? (et ? { ...et, sourceData: keptSourceData(et.sourceData) } : null)
  const editMode: Mode | null = !et ? null : et.type === 'income' ? 'income' : et.type === 'save_apply' || et.type === 'save_redeem' ? 'save' : 'expense'
  const { categories } = useCategories()
  const { wallets } = useWallets()
  const { profile } = useProfile()
  const refreshMonth = useRefresh()
  const { session } = useSession()
  const suggest = useCategorySuggest()

  // receita pendente (Pix de alguém da família) abre como Receita
  const [mode, setMode] = useState<Mode>(editMode ?? (pending?.type === 'income' || bill?.type === 'income' ? 'income' : initialMode))
  const [saveDirection, setSaveDirection] = useState<SaveDirection>(et?.type === 'save_redeem' ? 'redeem' : 'apply')
  const [amount, setAmount] = useState(edit ? editAmount(edit) : pending?.amount ?? bill?.amount ?? 0)
  const [date, setDate] = useState(() => (edit ? edit.info.firstDate ?? edit.tx.date : null) ?? pending?.date ?? editBill?.dueDate ?? todayIso())
  const [categoryId, setCategoryId] = useState<string | null>(() => et ? et.categoryId : pending ? pending.categoryId ?? suggest(pending.place) : bill?.categoryId ?? null)
  // null = ainda não escolheu: usa a carteira padrão do perfil
  const [pickedWalletId, setWalletId] = useState<string | null>(et?.walletId ?? pending?.walletId ?? bill?.walletId ?? null)
  const [place, setPlace] = useState((et ? et.place ?? et.description : null) ?? pending?.place ?? pending?.description ?? bill?.name ?? '')
  const [installments, setInstallments] = useState(() => edit?.info.installments ?? pendingNumber(pending, 'installments', 1))
  // compra parcelada que já estava andando antes do app: parcela atual e valor da parcela
  const [currentInstallment, setCurrentInstallment] = useState(() => edit?.info.start ?? pendingNumber(pending, 'current_installment', 1))
  const [amountIsInstallment, setAmountIsInstallment] = useState(pending?.sourceData?.amount_is_installment === true)
  // "Não lembro o cartão": fica pendente com o titular, até alguém escolher o cartão
  const [cardUnknown, setCardUnknown] = useState(!!pending?.holderId)
  const [holderId, setHolderId] = useState<string | null>(pending?.holderId ?? null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // leitura da nota fiscal (5.4)
  const [receipt, setReceipt] = useState<{ result: ReceiptResult; image: Blob } | null>(null)
  // foto da nota guardada como rascunho (sempre anexada ao registrar)
  const [receiptSaved, setReceiptSaved] = useState(false)
  // mesma NFC-e já registrada antes (pela chave do QR code)
  const [duplicateOn, setDuplicateOn] = useState<string | null>(null)
  // itens da compra: vêm da nota ou são digitados
  const [items, setItems] = useState<ReceiptItem[]>(() => pendingItems(et ?? pending))
  const discard = useConfirmDelete()
  // cartão próprio compartilhado: de quem é a compra ('' = sua)
  const [owner, setOwner] = useState(() => (et && edit && et.owner !== edit.me && !partsOf(et, 'split_parts') ? et.owner : ''))
  // receita que repete todo mês vira receita fixa (Contas, "A receber")
  const [repeat, setRepeat] = useState(() => billRepeat(editBill, initialRepeat))
  // gasto único que fica em Contas para pagar no vencimento
  const [later, setLater] = useState(false)
  // gasto com o nome de um gasto fixo em aberto no mês: paga o mês com este valor (padrão ligado)
  const [payFixed, setPayFixed] = useState(true)
  // dividir a compra no cartão entre pessoas (por item, igual ou por valor)
  const [split, setSplit] = useState(() => editSplit(edit))
  // Pix dividido: quem pagou ('' = você)
  const [payer, setPayer] = useState(() => (et?.paidBy && et.paidBy !== edit?.me ? et.paidBy : ''))
  // receita: quem enviou (opcional; alguém da família ou outro nome)
  const [sender, setSender] = useState<Sender | null>(() => bill?.recipient ?? senderOf((et ?? pending)?.sourceData))

  // edição: excluir, gasto fixo, divisão da parcela e o que muda a estrutura da compra
  const del = useTransactionDelete(() => { reset(); onOpenChange(false) })
  const pin = usePinAction()
  const parcel = useSplitParcel(et)
  const structure = JSON.stringify([mode, saveDirection, amount, pickedWalletId, installments, currentInstallment, amountIsInstallment,
    owner, split, payer, cardUnknown, edit && edit.info.rows > 1 ? date : null])
  const [initialStructure] = useState(structure)

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
    setReceiptSaved(false)
    setDuplicateOn(null)
    setItems([])
    setOwner('')
    setRepeat(repeatDefault(todayIso().slice(0, 7)))
    setLater(false)
    setPayFixed(true)
    setSplit(splitDefault())
    setPayer('')
    setSender(null)
  }

  function changeMode(next: Mode) {
    setMode(next)
    setCategoryId(null)
    setError(null)
  }

  const visibleCategories = (edit?.categories ?? categories).filter(c => c.type === (mode === 'income' ? 'income' : 'expense'))
  const unknownCard = mode === 'expense' && cardUnknown
  // gasto "Repetir todo mês": só à vista e com a carteira escolhida
  const repeatExpense = mode === 'expense' && repeat.on && !cardUnknown && installments <= 1
  // na edição, gasto fixo sem forma de pagamento continua sem (escolhida ao pagar)
  const walletId = unknownCard ? null : pickedWalletId ?? (bill ? null : profile?.defaultWalletId ?? null)
  const wallet = wallets.find(w => w.id === walletId)
  const isCredit = mode === 'expense' && wallet?.type === 'credit'
  // gasto no Pix: para quem foi (Destinatário)
  const isPix = mode === 'expense' && wallet?.type === 'pix' && !cardUnknown
  // parcelas valem no crédito e também quando o cartão ainda não foi escolhido
  // carteira do tipo Outro (ex.: linha de crédito) também parcela: cada parcela é um gasto no seu mês, sem fatura
  const installable = mode === 'expense' && wallet?.type === 'other'
  const creditLike = !bill && (isCredit || unknownCard || installable)
  // gasto fixo em aberto no mês da data com o mesmo nome: o registro paga esse mês, sem criar outro
  const { occurrences: monthBills } = useBills(date.slice(0, 7))
  const placeKey = normPlace(place.trim())
  const fixedMatch = mode === 'expense' && !bill && !pending && !edit && !cardUnknown && placeKey
    ? monthBills.find(o => o.bill.type === 'expense' && !o.bill.onCard && !o.paidAt && normPlace(o.bill.name) === placeKey) ?? null
    : null
  const payingFixed = !!fixedMatch && payFixed
  const me = session?.user.id ?? ''
  // divisão: no cartão próprio compartilhado, quem tem acesso; no cartão de outra pessoa, você e a titular
  const cardPeople = useCardPeople()
  // gasto dividido: qualquer forma de pagamento fora do crédito (Pix, débito, dinheiro, outro à vista);
  // quem pagou pode ser você ou outra pessoa da família
  const shareable = mode === 'expense' && !!wallet && wallet.type !== 'credit' && !cardUnknown
  const payerPeople = shareable && !bill && !payingFixed && !repeatExpense && installments <= 1 ? cardPeople.people : []
  const payerId = payer || me
  // outra pessoa já pagou: o que você deve vai para Repassar, sem "Pagar depois"
  const otherPaid = payerPeople.length > 1 && payerId !== me
  // "Pagar depois": gasto único, fora do cartão de crédito, que entra em Contas
  const canLater = mode === 'expense' && !bill && !pending && !edit && !isCredit && !unknownCard && !installable && !otherPaid
  const payLater = canLater && later && !repeat.on
  const needsCategory = mode !== 'save'
  const needsWallet = mode !== 'income'
  // séries antigas podem estar sem categoria ou forma de pagamento: a edição não exige
  const requireCategory = needsCategory && !bill && !edit
  const requireWallet = needsWallet && !bill
  const access = useCardAccess(isCredit ? walletId : null)
  const assignTo = access.people.some(p => p.userId === owner) && owner !== access.me ? owner : null
  // titulares possíveis: eu (se tenho cartão de crédito) e quem compartilha cartão comigo
  const holders = cardHolders(wallets, me)
  const holder = holderId ?? (holders.length === 1 ? holders[0].id : null)
  const hasWallet = unknownCard ? !!holder : !!walletId
  const splitWith = !isCredit || repeatExpense || payingFixed ? []
    : wallet?.ownerId && wallet.ownerId !== me ? cardPeople.people.filter(p => p.userId === me || p.userId === wallet.ownerId)
    : access.people
  const splitting = split.on && splitWith.length > 1
  // Pix dividido: com a família toda; pago por você e para pagar depois, não divide
  const pixPeople = payLater ? [] : payerPeople
  const sharedPix = pixPeople.length > 1 && (split.on || payerId !== me)
  const pixIds = sharedPix && split.on ? splitPeople(split, pixPeople, me) : [me]
  const splitResult = splitting
    ? splitParts({ mode: splitMode(split, items), total: amount, people: splitPeople(split, splitWith, me), items, values: split.values })
    : sharedPix
      ? (pixIds.length === 1
        ? { parts: [{ userId: pixIds[0], amount }], error: pixIds[0] === payerId ? 'Escolha quem divide o gasto.' : null }
        : splitParts({ mode: splitMode(split, items), total: amount, people: pixIds, items, values: split.values }))
      : null
  // pessoas cuja divisão aparece no grupo (cartão ou Pix)
  const dividing = splitting ? splitWith : sharedPix && split.on ? pixPeople : []
  // itens guardam o dono só na compra dividida
  const plainItems = items.map(it => ({ name: it.name, amount: it.amount }))
  const canSubmit = amount > 0 && (!requireCategory || !!categoryId) && (!requireWallet || hasWallet) && !splitResult?.error && !submitting

  function pickWallet(id: string) {
    setCardUnknown(false)
    setWalletId(id)
    // "Você" fora da divisão só vale no Pix pago por outra pessoa
    setSplit(v => ({ ...v, withoutMe: false }))
  }

  function pickPayer(id: string) {
    setPayer(id)
    if (id === me) setSplit(v => ({ ...v, withoutMe: false }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const placeValue = place.trim() || null
      if (edit) {
        await saveEdit(placeValue)
      } else if (bill) {
        await updateBill(placeValue)
      } else {
        await createNew(placeValue)
      }
      if (pending) await finishPending(pending)
      await refreshMonth()
      if (!bill && !edit) posthog.capture('transaction_recorded', {
        transaction_type: mode === 'save' ? `save_${saveDirection}` : mode,
        entry_pattern: pending ? 'pending_confirmation' : repeat.on ? 'recurring' : payLater ? 'pay_later' : installments > 1 ? 'installment' : 'one_time',
        has_receipt: Boolean(receipt),
        has_items: items.length > 0,
        is_split: splitting || sharedPix,
        card_unknown: unknownCard,
      })
      const done = bill || edit ? 'Salvo' : payingFixed ? 'Pago'
        : pending ? (mode === 'income' ? 'Receita confirmada' : 'Gasto confirmado')
        : mode === 'save' ? (saveDirection === 'apply' ? 'Guardado' : 'Resgatado')
        : mode === 'income' ? (repeat.on ? 'Receita fixa adicionada' : 'Receita adicionada')
        : repeatExpense ? 'Gasto fixo adicionado'
        : payLater ? 'Enviado para Contas'
        : unknownCard ? 'Enviado para confirmar'
        : splitting ? 'Compra dividida' : sharedPix ? 'Gasto dividido' : 'Gasto adicionado'
      reset()
      onOpenChange(false)
      feedback.done(done)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível registrar.')
    } finally {
      setSubmitting(false)
    }
  }

  // registra o lançamento novo (o caminho de sempre do Novo gasto)
  async function createNew(placeValue: string | null) {
    if (payingFixed && fixedMatch) {
      // o valor deste mês pode ser outro: muda só esta ocorrência e paga
      if (amount !== fixedMatch.amount) await billsApi.updateOccurrence(fixedMatch.id, amount, fixedMatch.dueDate)
      await billsApi.pay(fixedMatch.id, walletId, date)
    } else if (payLater) {
      await createPayLater(placeValue)
    } else if (mode === 'income' && repeat.on) {
      await createRecurringIncome(placeValue)
    } else if (mode === 'expense' && repeatExpense) {
      await createRecurringExpense(placeValue)
    } else if (sharedPix) {
      await createSharedPix(placeValue)
    } else if (unknownCard) {
      await createWithoutCard(placeValue)
    } else if ((isCredit || installable) && installments > 1) {
      const group = await transactionsApi.createInstallments({
        walletId: walletId!, categoryId, installments, firstDate: date, place: placeValue,
        total: amountIsInstallment ? amount * installments : amount,
        start: Math.min(currentInstallment, installments),
        ...(origin ? { source: origin.source } : {}),
      })
      if (items.length) await transactionsApi.setGroupItems(group, plainItems)
      if (receipt || et?.receiptPath) {
        const path = await takeReceipt()
        if (path) await transactionsApi.setGroupReceipt(group, path)
      }
      if (splitting) {
        const [first] = await transactionsApi.idsOfGroup(group)
        if (first) await applySplit(first)
      } else if (assignTo) {
        // assign_purchase vale para todas as parcelas em aberto da compra
        const [first] = await transactionsApi.idsOfGroup(group)
        if (first) await familyApi.assignPurchase(first, assignTo)
      }
    } else {
      const fromPhoto = mode === 'expense' && receipt
      // receita: quem enviou; gasto no Pix: para quem foi
      const withSender = mode === 'income' || isPix ? senderData(sender) : {}
      const receiptPath = fromPhoto ? await takeReceipt() : null
      const created = await transactionsApi.create({
        ...(fromPhoto ? {
          source: 'photo',
          sourceData: { reader: receipt.result.source, items: plainItems, ...(receipt.result.chave ? { chave: receipt.result.chave } : {}), ...withSender },
          receiptPath,
        } : origin ? {
          source: origin.source,
          sourceData: { ...(origin.sourceData ?? {}), ...(mode === 'expense' && items.length ? { items: plainItems } : {}), ...withSender },
          ...(et?.receiptPath ? { receiptPath: et.receiptPath } : {}),
        } : mode === 'expense' && items.length ? { sourceData: { items: plainItems, ...withSender } }
          : sender && (mode === 'income' || isPix) ? { sourceData: withSender } : {}),
        type: mode === 'save' ? (saveDirection === 'apply' ? 'save_apply' : 'save_redeem') : mode,
        amount,
        date,
        categoryId: mode === 'save' ? null : categoryId,
        walletId: needsWallet ? walletId : null,
        place: mode === 'income' ? null : placeValue,
        description: mode === 'income' ? placeValue : null,
      })
      if (splitting) await applySplit(created.id)
      else if (assignTo && isCredit) await familyApi.assignPurchase(created.id, assignTo)
    }
  }

  // edição: lançamento simples muda no lugar; compra parcelada ou dividida sem mudar valor, parcelas, cartão ou
  // divisão muda local, categoria e itens em todas as partes; mudou a estrutura, registra de novo e exclui a antiga
  async function saveEdit(placeValue: string | null) {
    if (!edit || !et) return
    const simple = edit.info.rows <= 1 && !et.sharedPaymentId && !partsOf(et, 'split_parts')
    if (simple && !splitting && !sharedPix && !unknownCard && !(creditLike && installments > 1)) {
      const withSender = mode === 'income' || isPix ? senderData(sender) : {}
      await transactionsApi.update(et.id, {
        type: mode === 'save' ? (saveDirection === 'apply' ? 'save_apply' : 'save_redeem') : mode,
        amount, date,
        categoryId: mode === 'save' ? null : categoryId,
        walletId: needsWallet ? walletId : null,
        place: mode === 'income' ? null : placeValue,
        description: mode === 'income' ? placeValue : null,
        sourceData: { ...Object.fromEntries(Object.entries(et.sourceData ?? {}).filter(([k]) => k !== 'sender' && k !== 'items')),
          ...(mode === 'expense' && items.length ? { items: plainItems } : {}), ...withSender },
      })
      const initialOwner = et.owner !== edit.me ? et.owner : ''
      if (isCredit && owner !== initialOwner) await familyApi.assignPurchase(et.id, assignTo ?? me)
      return
    }
    if (structure === initialStructure) {
      await transactionsApi.updatePurchaseInfo(et.id, placeValue, categoryId, items)
      await parcel.save()
      return
    }
    if (et.prepaidBy) throw new Error('Desfaça a antecipação antes de mudar valor, parcelas ou divisão.')
    await createNew(placeValue)
    if (et.sharedPaymentId) await sharedApi.remove(et.sharedPaymentId)
    else await transactionsApi.removePurchase(et.id)
  }

  // a foto lida vira definitiva ao registrar; se falhar, o gasto entra sem ela
  async function takeReceipt(): Promise<string | null> {
    const kept = et?.receiptPath ?? null
    if (!receiptSaved || !session) return kept
    try { return await commitReceiptDraft(session.user.id) } catch { return kept }
  }

  async function saveReceipt(image: Blob) {
    setReceiptSaved(false)
    if (!session) throw new Error('Sem sessão')
    await saveReceiptDraft(session.user.id, image)
    setReceiptSaved(true)
  }

  // divide a compra já criada; por item, cada item vai com o seu dono (sem dono = você);
  // igual ou por valor, os itens ficam para todos
  async function applySplit(id: string) {
    if (!splitResult) return
    const byItem = splitMode(split, items) === 'item'
    await familyApi.splitPurchase(id, splitResult.parts,
      items.map(it => ({ ...it, owner: byItem ? it.owner ?? me : SPLIT_ALL })))
  }

  // Pix dividido: cada pessoa ganha a sua parte; o dinheiro sai de quem pagou. Por item, os itens vão com o dono.
  async function createSharedPix(placeValue: string | null) {
    if (!splitResult) return
    const byItem = split.on && splitMode(split, items) === 'item'
    const fromPhoto = receipt
    const receiptPath = fromPhoto ? await takeReceipt() : et?.receiptPath ?? null
    await sharedApi.create({
      payerId, walletId: payerId === me ? walletId : null, amount, date, place: placeValue, categoryId,
      parts: splitResult.parts,
      source: fromPhoto ? 'photo' : origin?.source ?? 'manual',
      receiptPath,
      sourceData: {
        ...(origin?.sourceData ?? {}),
        ...(fromPhoto ? { reader: receipt.result.source, ...(receipt.result.chave ? { chave: receipt.result.chave } : {}) } : {}),
        ...(items.length ? { items: items.map(it => ({ name: it.name, amount: it.amount, owner: byItem ? it.owner ?? pixIds[0] : SPLIT_ALL })) } : {}),
        ...senderData(sender),
      },
    })
  }

  // compra sem cartão: pendente, com o titular e as parcelas guardadas para quando escolherem o cartão
  async function createWithoutCard(placeValue: string | null) {
    const fromPhoto = receipt
    const receiptPath = fromPhoto ? await takeReceipt() : null
    await transactionsApi.create({
      type: 'expense', amount, date, categoryId, walletId: null, place: placeValue, description: null,
      status: 'pending', holderId: holder,
      source: fromPhoto ? 'photo' : origin?.source ?? 'manual',
      receiptPath,
      sourceData: {
        ...(origin?.sourceData ?? {}),
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

  // destinatário só vale no Pix
  const billRecipient = () => (isPix && sender?.name.trim() ? { userId: sender.userId, name: sender.name.trim() } : null)

  // gasto que repete todo mês vira gasto fixo: no cartão de crédito, entra sozinho na fatura (bills.wallet_id);
  // em Pix/débito/dinheiro, é conta a pagar com essa forma de pagamento (e o destinatário, no Pix).
  // Se a data já chegou, este mês já entra lançado.
  async function createRecurringExpense(name: string | null) {
    const start = date.slice(0, 7)
    const last = repeatLastMonth(repeat, start)
    const billId = await billsApi.create({
      type: 'expense', name: name ?? categories.find(c => c.id === categoryId)?.name ?? 'Gasto fixo',
      amount, dueDay: Number(date.slice(8, 10)), dueNextMonth: false, categoryId, recurring: true,
      startMonth: `${start}-01`, installmentCurrent: null, installmentsTotal: null,
      endMonth: last ? `${last}-01` : null, walletId, recipient: billRecipient(),
    })
    // o cartão é lançado sozinho ao gerar o mês; nas outras carteiras, paga a ocorrência se a data já chegou
    const occurrence = (await billsApi.getMonth(start)).find(o => o.billId === billId)
    if (!isCredit && occurrence && date <= todayIso() && walletId) await billsApi.pay(occurrence.id, walletId, date)
  }

  // gasto único a pagar no vencimento: conta que não repete, no mês da data
  async function createPayLater(name: string | null) {
    await billsApi.create({
      type: 'expense', name: name ?? categories.find(c => c.id === categoryId)?.name ?? 'Gasto',
      amount, dueDay: Number(date.slice(8, 10)), dueNextMonth: false, categoryId, recurring: false,
      startMonth: `${date.slice(0, 7)}-01`, installmentCurrent: null, installmentsTotal: null,
      endMonth: null, walletId, recipient: billRecipient(),
    })
  }

  // edição da série a partir do mês da ocorrência; o gasto único muda de mês junto com a data
  async function updateBill(name: string | null) {
    if (!bill || !editBill) return
    const income = bill.type === 'income'
    const single = !bill.recurring && bill.installmentsTotal == null
    const base = bill.startMonth.slice(0, 7)
    const last = repeat.on ? repeatLastMonth(repeat, base) : null
    await billsApi.updateSeries(bill.id, single ? base : editBill.refMonth.slice(0, 7), {
      name: name ?? bill.name, amount, dueDay: Number(date.slice(8, 10)), categoryId,
      ...(isCredit ? { dueNextMonth: false } : {}),
      ...(repeat.on ? { endMonth: last ? `${last}-01` : null } : {}),
      ...(single ? { startMonth: `${date.slice(0, 7)}-01` } : {}),
      walletId: income ? null : walletId,
      recipient: income ? null : billRecipient(),
    })
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

  const modeTitle = edit ? (mode === 'income' ? 'Editar receita' : mode === 'save' ? 'Editar guardado' : 'Editar gasto')
    : bill ? (bill.type === 'income' ? 'Editar receita fixa' : repeat.on ? 'Editar gasto fixo' : 'Editar gasto')
    : pending ? (pending.type === 'income' ? 'Receita pendente' : 'Gasto pendente')
    : mode === 'expense' ? (repeat.on ? 'Novo gasto fixo' : 'Novo gasto')
    : mode === 'income' ? (repeat.on ? 'Nova receita fixa' : 'Nova receita') : 'Guardar'
  const submitLabel = pending ? 'Confirmar' : bill || edit ? 'Salvar' : 'Adicionar'
  const dateLabel = creditLike && installments > 1 ? 'Data da compra' : payLater || (bill && mode === 'expense') ? 'Vencimento' : 'Data'

  function askDiscard(t: Transaction) {
    discard.ask({
      title: t.type === 'income' ? 'Descartar receita?' : 'Descartar gasto?', label: 'Descartar',
      remove: async () => { await transactionsApi.remove(t.id); reset(); onOpenChange(false) },
    })
  }

  return (
    <>
    {discard.sheet}
    {del.sheet}
    {pin.sheet}
    <Sheet open={open} onOpenChange={o => { onOpenChange(o); if (!o) reset() }}>
      <SheetContent side="bottom" showCloseButton={false} className="gap-0">
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          {/* barra do modal no iOS 26: fechar (só o X) | título | confirmar (cápsula preenchida) */}
          <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center px-3 pt-1 pb-2">
            <SheetCloseButton label="Cancelar" />
            <SheetTitle className="text-headline font-semibold">{modeTitle}</SheetTitle>
            {pending ? (
              <Button type="button" variant="plain-destructive" size="nav" className="justify-self-end" onClick={() => askDiscard(pending)}>
                Descartar
              </Button>
            ) : et ? (
              <Button type="button" variant="plain-destructive" size="nav" className="justify-self-end" onClick={() => del.ask(et)}>
                Excluir
              </Button>
            ) : (
              <GlassButton type="submit" size="capsule" tone="prominent" className="justify-self-end font-semibold" disabled={!canSubmit}>
                {submitting ? <LoadingDots size="sm" tone="current" label="Salvando" /> : submitLabel}
              </GlassButton>
            )}
          </div>

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 pt-2 pb-6">
            {!bill && <SegmentedControl
              aria-label="Tipo de registro"
              value={mode}
              onChange={changeMode}
              options={[
                { value: 'expense', label: 'Gasto' },
                { value: 'income', label: 'Receita' },
                { value: 'save', label: 'Guardar' },
              ]}
            />}

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

            {mode === 'expense' && !bill && !edit && <ReceiptScanButton onRead={onReceipt} onSave={saveReceipt} initialFile={initialReceipt} />}

            <CurrencyInput
              id="amount"
              aria-label="Valor"
              variant="display"
              value={amount}
              onChange={setAmount}
            />

            <ListGroup>
              <FormRow label={dateLabel} htmlFor="date">
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
              {mode === 'income' && !repeat.on && (
                <SenderRows id="qa-sender" value={sender} onChange={setSender} people={cardPeople.people} me={me} />
              )}
            </ListGroup>

            {mode === 'income' && !pending && !edit && (!bill || repeat.on) && (
              <RepeatGroup value={repeat} onChange={setRepeat} start={bill ? bill.startMonth.slice(0, 7) : date.slice(0, 7)}
                lastLabel="último recebimento" fixed={!!bill} />
            )}
            {fixedMatch && (
              <ListGroup footer={payFixed ? `Paga ${fixedMatch.bill.name} deste mês com este valor.` : undefined}>
                <FormRow label="Pagar gasto fixo">
                  <Switch checked={payFixed} onCheckedChange={setPayFixed} />
                </FormRow>
              </ListGroup>
            )}
            {mode === 'expense' && !edit && !payingFixed && !unknownCard && installments <= 1 && (!bill || repeat.on) && (
              <RepeatGroup value={repeat} onChange={setRepeat} start={bill ? bill.startMonth.slice(0, 7) : date.slice(0, 7)}
                lastLabel={isCredit ? 'último lançamento no cartão' : 'último pagamento'} fixed={!!bill}
                later={canLater ? { on: later, onChange: setLater } : undefined} />
            )}

            {mode === 'expense' && receipt && (
              <ReceiptResultGroup source={receipt.result.source} items={[]} duplicateOn={duplicateOn} />
            )}

            {(needsCategory || needsWallet) && (
              <ListGroup footer={unknownCard ? holderFooter(holders, holder, me)
                : splitting || (sharedPix && split.on) ? splitSummary(split, dividing, me, items, amount)
                : sharedPix ? `Você deve ${formatCurrency(amount)} a ${cardPeople.nameOf(payerId)}.` : undefined}>
                {needsCategory && <CategoryField id="qa-category" categories={visibleCategories} value={categoryId} onChange={setCategoryId} />}
                {needsWallet && (
                  <PickerRow id="qa-wallet" label={walletQuestion}
                    value={unknownCard ? UNKNOWN_CARD : walletId}
                    onChange={v => { if (v === UNKNOWN_CARD) setCardUnknown(true); else if (v) pickWallet(v) }}
                    options={[
                      ...wallets.filter(w => mode !== 'save' || w.type !== 'credit').map(walletOption),
                      ...(mode === 'expense' && !bill && !edit && holders.length > 0 ? [{ value: UNKNOWN_CARD, label: 'Não lembro o cartão', icon: 'credit-card' }] : []),
                    ]} />
                )}
                {unknownCard && <HolderPicker holders={holders} value={holder} onChange={setHolderId} me={me} />}
                {isPix && (
                  <SenderRows id="qa-recipient" label="Destinatário" value={sender} onChange={setSender} people={cardPeople.people} me={me} />
                )}
                {payerPeople.length > 1 && <PayerRow id="qa-payer" value={payerId} onChange={pickPayer} people={payerPeople} me={me} />}
                {creditLike && (
                  <FormRow label="Parcelas" htmlFor="installments">
                    <NumberField id="installments" min={1} max={48} value={installments}
                      onChange={setInstallments} className="w-16 text-right" />
                  </FormRow>
                )}
                {creditLike && installments > 1 && (
                  <InstallmentProgress installments={installments} current={currentInstallment} onCurrentChange={setCurrentInstallment}
                    amountIsInstallment={amountIsInstallment} onAmountIsInstallmentChange={setAmountIsInstallment}
                    purchaseDate={date} amount={amount} />
                )}
                {mode === 'expense' && !bill && splitWith.length > 1 && (
                  <SplitRows value={split} onChange={setSplit} people={splitWith} me={me} items={items} total={amount} />
                )}
                {pixPeople.length > 1 && (
                  <SplitRows value={split} onChange={setSplit} people={pixPeople} me={me} items={items} total={amount}
                    meOptional={payerId !== me} />
                )}
              </ListGroup>
            )}

            {isCredit && !bill && !unknownCard && !splitting && <PurchaseOwnerField people={access.people} me={access.me} value={owner} onChange={setOwner} />}

            {/* compra dividida por item: cada item mostra de quem é */}
            {mode === 'expense' && !bill && !payLater && !repeatExpense && (
              <ItemsEditor items={items} onChange={setItems} total={amount}
                owners={dividing.length > 1 && splitMode(split, items) === 'item'
                  ? { options: itemOwnerOptions(split, dividing, me), fallback: splitPeople(split, dividing, me)[0] ?? me } : undefined} />
            )}

            {/* edição: valor de cada pessoa na parcela, gasto fixo, antecipar e comprovante */}
            {et && parcel.active && structure === initialStructure && (
              <SplitParcelGroups t={et} state={parcel} nameOf={cardPeople.nameOf} />
            )}
            {et && pin.can(et) && (
              <ListGroup footer={pin.pinned(et) ? 'Repete todo mês até você desligar.' : undefined}>
                <FormRow label="Gasto fixo">
                  <Switch checked={pin.pinned(et)}
                    onCheckedChange={on => { if (on) pin.pin(et).then(() => onOpenChange(false)); else pin.askUnpin(et) }} />
                </FormRow>
              </ListGroup>
            )}
            {et && et.type === 'expense' && et.invoiceRef && wallets.some(w => w.id === et.walletId && w.type === 'credit' && !w.ownerName) && (
              <PrepayGroup t={et} onDone={() => onOpenChange(false)} />
            )}
            {et?.receiptPath && (
              <Button type="button" variant="secondary" className="w-full"
                onClick={async () => { const url = await receiptUrl(et.receiptPath!); if (url) window.open(url, '_blank') }}>
                Ver comprovante
              </Button>
            )}

            {error && <p className="px-4 text-footnote text-destructive">{error}</p>}

            <Button type="submit" size="lg" className="w-full" disabled={!canSubmit}>
              {submitting ? <LoadingDots tone="current" label={bill ? 'Salvando' : 'Adicionando'} /> : submitLabel}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
    </>
  )
}
