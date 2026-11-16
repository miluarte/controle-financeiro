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
import { ChoiceChip } from '@/components/shared/choice-chip'
import { CurrencyInput } from '@/components/shared/currency-input'
import { NumberField } from '@/components/shared/number-field'
import { TokenIcon } from '@/components/shared/token-icon'
import { useCategories } from '@/hooks/use-categories'
import { useProfile } from '@/hooks/use-profile'
import { useRefresh } from '@/hooks/use-refresh'
import { useWallets } from '@/hooks/use-wallets'
import { transactionsApi } from '@/lib/api/transactions'
import { WALLET_TYPE_ICON } from '@/lib/constants'
import { uploadReceipt, walletForReceipt, type ReceiptResult } from '@/lib/receipt'
import { ReceiptResultGroup } from '@/components/receipt/receipt-result-group'
import { ReceiptScanButton } from '@/components/receipt/receipt-scan-button'
import { useSession } from '@/hooks/use-session'
import type { Wallet } from '@/lib/types'
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

export type QuickAddMode = 'expense' | 'income' | 'save'
type Mode = QuickAddMode
type SaveDirection = 'apply' | 'redeem'

function walletLabel(w: Wallet) {
  return w.ownerName ? `${w.name}, de ${w.ownerName}` : w.name
}

// 5.3: registro rápido de Gasto, Receita e Guardar. Abre pelo + da barra de abas (AddMenu).
interface QuickAddSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialMode?: Mode
}

export function QuickAddSheet({ open, onOpenChange, initialMode = 'expense' }: QuickAddSheetProps) {
  const { categories } = useCategories()
  const { wallets } = useWallets()
  const { profile } = useProfile()
  const refreshMonth = useRefresh()
  const { session } = useSession()
  const suggest = useCategorySuggest()

  const [mode, setMode] = useState<Mode>(initialMode)
  const [saveDirection, setSaveDirection] = useState<SaveDirection>('apply')
  const [amount, setAmount] = useState(0)
  const [date, setDate] = useState(todayIso)
  const [categoryId, setCategoryId] = useState<string | null>(null)
  // null = ainda não escolheu: usa a carteira padrão do perfil
  const [pickedWalletId, setWalletId] = useState<string | null>(null)
  const [place, setPlace] = useState('')
  const [installments, setInstallments] = useState(1)
  // compra parcelada que já estava andando antes do app: parcela atual e valor da parcela
  const [currentInstallment, setCurrentInstallment] = useState(1)
  const [amountIsInstallment, setAmountIsInstallment] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // leitura da nota fiscal (5.4)
  const [receipt, setReceipt] = useState<{ result: ReceiptResult; image: Blob } | null>(null)
  const [attachReceipt, setAttachReceipt] = useState(false)
  // mesma NFC-e já registrada antes (pela chave do QR code)
  const [duplicateOn, setDuplicateOn] = useState<string | null>(null)
  // itens da compra: vêm da nota ou são digitados
  const [items, setItems] = useState<ReceiptItem[]>([])
  // cartão próprio compartilhado: de quem é a compra ('' = sua)
  const [owner, setOwner] = useState('')
  // receita que repete todo mês vira receita fixa (Contas, "A receber")
  const [repeat, setRepeat] = useState(() => repeatDefault(todayIso().slice(0, 7)))

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
  const walletId = pickedWalletId ?? profile?.defaultWalletId ?? null
  const wallet = wallets.find(w => w.id === walletId)
  const isCredit = mode === 'expense' && wallet?.type === 'credit'
  const needsCategory = mode !== 'save'
  const needsWallet = mode !== 'income'
  const access = useCardAccess(isCredit ? walletId : null)
  const assignTo = access.people.some(p => p.userId === owner) && owner !== access.me ? owner : null
  const canSubmit = amount > 0 && (!needsCategory || !!categoryId) && (!needsWallet || !!walletId) && !submitting

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const placeValue = place.trim() || null
      if (mode === 'income' && repeat.on) {
        await createRecurringIncome(placeValue)
      } else if (isCredit && installments > 1) {
        const group = await transactionsApi.createInstallments({
          walletId: walletId!, categoryId, installments, firstDate: date, place: placeValue,
          total: amountIsInstallment ? amount * installments : amount,
          start: Math.min(currentInstallment, installments),
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
      await refreshMonth()
      reset()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível registrar.')
    } finally {
      setSubmitting(false)
    }
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

  const walletQuestion =
    mode === 'save' ? (saveDirection === 'apply' ? 'De qual carteira saiu?' : 'Para qual carteira voltou?') : 'Como você pagou?'
  const placeLabel = mode === 'income' ? 'Descrição' : mode === 'save' ? 'Onde?' : 'Onde foi?'
  const placePlaceholder = mode === 'income' ? (repeat.on ? 'Salário, aluguel…' : 'Opcional') : mode === 'save' ? 'CDB, Tesouro' : 'Opcional'

  const modeTitle = mode === 'expense' ? 'Novo gasto' : mode === 'income' ? 'Nova receita' : 'Guardar'

  return (
    <Sheet open={open} onOpenChange={o => { onOpenChange(o); if (!o) reset() }}>
      <SheetContent side="bottom" showCloseButton={false} className="gap-0">
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          {/* barra do modal no iOS 26: fechar (vidro) | título | confirmar (cápsula preenchida) */}
          <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center px-3 pt-1 pb-2">
            <SheetClose render={<GlassButton type="button" aria-label="Cancelar" className="justify-self-start" />}>
              <CloseLinearIcon />
            </SheetClose>
            <SheetTitle className="text-headline font-semibold">{modeTitle}</SheetTitle>
            <GlassButton type="submit" size="capsule" tone="prominent" className="justify-self-end font-semibold" disabled={!canSubmit}>
              {submitting ? <LoadingDots size="sm" tone="current" label="Salvando" /> : 'Registrar'}
            </GlassButton>
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

            {mode === 'expense' && <ReceiptScanButton onRead={onReceipt} />}

            <CurrencyInput
              id="amount"
              aria-label="Valor"
              variant="display"
              value={amount}
              onChange={setAmount}
            />

            <ListGroup>
              <FormRow label={isCredit && installments > 1 ? 'Data da compra' : 'Data'} htmlFor="date">
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
              {isCredit && (
                <FormRow label="Parcelas" htmlFor="installments">
                  <NumberField id="installments" min={1} max={48} value={installments}
                    onChange={setInstallments} className="w-16 text-right" />
                </FormRow>
              )}
              {isCredit && installments > 1 && (
                <InstallmentProgress installments={installments} current={currentInstallment} onCurrentChange={setCurrentInstallment}
                  amountIsInstallment={amountIsInstallment} onAmountIsInstallmentChange={setAmountIsInstallment}
                  purchaseDate={date} />
              )}
            </ListGroup>

            {mode === 'income' && (
              <RepeatGroup value={repeat} onChange={setRepeat} start={date.slice(0, 7)} lastLabel="último recebimento" />
            )}

            {mode === 'expense' && receipt && (
              <ReceiptResultGroup source={receipt.result.source} items={[]} duplicateOn={duplicateOn}
                attach={attachReceipt} onAttachChange={setAttachReceipt} attachDisabled={isCredit && installments > 1} />
            )}

            {needsCategory && (
              <ListGroup header="Categoria">
                <li className="flex flex-wrap gap-2 p-3">
                  {visibleCategories.map(c => (
                    <ChoiceChip key={c.id} selected={categoryId === c.id} onClick={() => setCategoryId(c.id)} className="pl-1">
                      <TokenIcon active={categoryId === c.id} icon={c.icon} color={c.color} size="sm" />
                      {c.name}
                    </ChoiceChip>
                  ))}
                </li>
              </ListGroup>
            )}

            {needsWallet && (
              <ListGroup header={walletQuestion}>
                <li className="flex flex-wrap gap-2 p-3">
                  {wallets
                    .filter(w => mode !== 'save' || w.type !== 'credit')
                    .map(w => (
                      <ChoiceChip key={w.id} selected={walletId === w.id} onClick={() => setWalletId(w.id)} className="pl-1">
                        <TokenIcon active={walletId === w.id} icon={WALLET_TYPE_ICON[w.type] ?? 'wallet'} color="gray" size="sm" />
                        {walletLabel(w)}
                      </ChoiceChip>
                    ))}
                </li>
              </ListGroup>
            )}

            {isCredit && <PurchaseOwnerField people={access.people} me={access.me} value={owner} onChange={setOwner} />}

            {mode === 'expense' && <ItemsEditor items={items} onChange={setItems} total={amount} />}

            {error && <p className="px-4 text-footnote text-destructive">{error}</p>}

            <Button type="submit" size="lg" className="w-full" disabled={!canSubmit}>
              {submitting ? <LoadingDots tone="current" label="Registrando" /> : 'Registrar'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
