'use client'

import { useState } from 'react'
import { AddBoldDuotoneIcon, CloseBoldDuotoneIcon } from '@solar-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { FormRow } from '@/components/ios/form-row'
import { GlassButton } from '@/components/ios/glass-button'
import { ListGroup } from '@/components/ios/list-group'
import { SegmentedControl } from '@/components/ios/segmented-control'
import { ChoiceChip } from '@/components/shared/choice-chip'
import { CurrencyInput } from '@/components/shared/currency-input'
import { TokenIcon } from '@/components/shared/token-icon'
import { useCategories } from '@/hooks/use-categories'
import { useProfile } from '@/hooks/use-profile'
import { useRefresh } from '@/hooks/use-refresh'
import { useWallets } from '@/hooks/use-wallets'
import { transactionsApi } from '@/lib/api/transactions'
import { WALLET_TYPE_ICON } from '@/lib/constants'
import type { Wallet } from '@/lib/types'
import { todayIso } from '@/lib/utils'

type Mode = 'expense' | 'income' | 'save'
type SaveDirection = 'apply' | 'redeem'

function walletLabel(w: Wallet) {
  return w.ownerName ? `${w.name}, de ${w.ownerName}` : w.name
}

// 5.3: registro rápido de Gasto, Receita e Guardar.
export function QuickAddSheet() {
  const { categories } = useCategories()
  const { wallets } = useWallets()
  const { profile } = useProfile()
  const refreshMonth = useRefresh()

  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('expense')
  const [saveDirection, setSaveDirection] = useState<SaveDirection>('apply')
  const [amount, setAmount] = useState(0)
  const [date, setDate] = useState(todayIso)
  const [categoryId, setCategoryId] = useState<string | null>(null)
  // null = ainda não escolheu: usa a carteira padrão do perfil
  const [pickedWalletId, setWalletId] = useState<string | null>(null)
  const [place, setPlace] = useState('')
  const [installments, setInstallments] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setAmount(0)
    setDate(todayIso())
    setCategoryId(null)
    setPlace('')
    setInstallments(1)
    setError(null)
    setWalletId(null)
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
  const canSubmit = amount > 0 && (!needsCategory || !!categoryId) && (!needsWallet || !!walletId) && !submitting

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const placeValue = place.trim() || null
      if (isCredit && installments > 1) {
        await transactionsApi.createInstallments({
          walletId: walletId!, categoryId, total: amount, installments, firstDate: date, place: placeValue,
        })
      } else {
        await transactionsApi.create({
          type: mode === 'save' ? (saveDirection === 'apply' ? 'save_apply' : 'save_redeem') : mode,
          amount,
          date,
          categoryId: mode === 'save' ? null : categoryId,
          walletId: needsWallet ? walletId : null,
          place: mode === 'income' ? null : placeValue,
          description: mode === 'income' ? placeValue : null,
        })
      }
      await refreshMonth()
      reset()
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível registrar.')
    } finally {
      setSubmitting(false)
    }
  }

  const walletQuestion =
    mode === 'save' ? (saveDirection === 'apply' ? 'De qual carteira saiu?' : 'Para qual carteira voltou?') : 'Como você pagou?'
  const placeLabel = mode === 'income' ? 'Descrição' : mode === 'save' ? 'Onde?' : 'Onde foi?'
  const placePlaceholder = mode === 'income' ? 'Opcional' : mode === 'save' ? 'CDB, Tesouro' : 'Opcional'

  const modeTitle = mode === 'expense' ? 'Novo gasto' : mode === 'income' ? 'Nova receita' : 'Guardar'

  return (
    <Sheet open={open} onOpenChange={o => { setOpen(o); if (!o) reset() }}>
      <SheetTrigger
        render={
          <GlassButton aria-label="Registrar">
            <AddBoldDuotoneIcon />
          </GlassButton>
        }
      />
      <SheetContent side="bottom" showCloseButton={false} className="gap-0">
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          {/* barra do modal no iOS 26: fechar (vidro) | título | confirmar (cápsula preenchida) */}
          <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center px-3 pt-1 pb-2">
            <SheetClose render={<GlassButton type="button" aria-label="Cancelar" className="justify-self-start" />}>
              <CloseBoldDuotoneIcon />
            </SheetClose>
            <SheetTitle className="text-headline font-semibold">{modeTitle}</SheetTitle>
            <GlassButton type="submit" size="capsule" tone="prominent" className="justify-self-end font-semibold" disabled={!canSubmit}>
              {submitting ? 'Salvando…' : 'Registrar'}
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

            <CurrencyInput
              id="amount"
              aria-label="Valor"
              variant="display"
              value={amount}
              onChange={setAmount}
            />

            <ListGroup>
              <FormRow label="Data" htmlFor="date">
                <Input
                  id="date"
                  type="date"
                  variant="bare"
                  value={date}
                  onChange={e => setDate(e.target.value || todayIso())}
                  className="w-auto text-right text-tint"
                />
              </FormRow>
              <FormRow label={placeLabel} htmlFor="place">
                <Input
                  id="place"
                  variant="bare"
                  value={place}
                  onChange={e => setPlace(e.target.value)}
                  placeholder={placePlaceholder}
                  className="text-right"
                />
              </FormRow>
              {isCredit && (
                <FormRow label="Parcelas" htmlFor="installments">
                  <Input
                    id="installments"
                    type="number"
                    inputMode="numeric"
                    variant="bare"
                    min={1}
                    max={48}
                    value={installments}
                    onChange={e => setInstallments(Math.min(48, Math.max(1, Number(e.target.value) || 1)))}
                    className="w-16 text-right"
                  />
                </FormRow>
              )}
            </ListGroup>

            {needsCategory && (
              <ListGroup header="Categoria">
                <li className="flex flex-wrap gap-2 p-3">
                  {visibleCategories.map(c => (
                    <ChoiceChip key={c.id} selected={categoryId === c.id} onClick={() => setCategoryId(c.id)} className="pl-1">
                      <TokenIcon icon={c.icon} color={c.color} size="sm" />
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
                        <TokenIcon icon={WALLET_TYPE_ICON[w.type] ?? 'wallet'} color="gray" size="sm" />
                        {walletLabel(w)}
                      </ChoiceChip>
                    ))}
                </li>
              </ListGroup>
            )}

            {error && <p className="px-4 text-footnote text-destructive">{error}</p>}

            <Button type="submit" size="lg" className="w-full" disabled={!canSubmit}>
              {submitting ? 'Registrando…' : 'Registrar'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
