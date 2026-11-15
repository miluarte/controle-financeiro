'use client'

import { useState } from 'react'
import { AddBoldDuotoneIcon } from '@solar-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChoiceChip } from '@/components/shared/choice-chip'
import { CurrencyInput } from '@/components/shared/currency-input'
import { TokenIcon } from '@/components/shared/token-icon'
import { useCategories } from '@/hooks/use-categories'
import { useProfile } from '@/hooks/use-profile'
import { useRefreshMonth } from '@/hooks/use-refresh-month'
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
  const refreshMonth = useRefreshMonth()

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
  const placeLabel = mode === 'income' ? 'Descrição (opcional)' : mode === 'save' ? 'Onde? (opcional)' : 'Onde foi? (opcional)'
  const placePlaceholder = mode === 'income' ? 'Ex.: salário de novembro' : mode === 'save' ? 'Ex.: CDB, Tesouro' : 'Ex.: Mercado'

  return (
    <Sheet open={open} onOpenChange={o => { setOpen(o); if (!o) reset() }}>
      <SheetTrigger
        render={
          <Button size="icon-lg" className="rounded-full shadow-lg" aria-label="Registrar">
            <AddBoldDuotoneIcon className="size-6" />
          </Button>
        }
      />
      <SheetContent side="bottom" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Registrar</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5 px-4 pb-6">
          <Tabs value={mode} onValueChange={v => changeMode(v as Mode)}>
            <TabsList className="w-full">
              <TabsTrigger value="expense" className="flex-1">Gasto</TabsTrigger>
              <TabsTrigger value="income" className="flex-1">Receita</TabsTrigger>
              <TabsTrigger value="save" className="flex-1">Guardar</TabsTrigger>
            </TabsList>
          </Tabs>

          {mode === 'save' && (
            <div className="flex gap-2">
              <ChoiceChip selected={saveDirection === 'apply'} onClick={() => setSaveDirection('apply')}>Aplicar</ChoiceChip>
              <ChoiceChip selected={saveDirection === 'redeem'} onClick={() => setSaveDirection('redeem')}>Resgatar</ChoiceChip>
            </div>
          )}

          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor</Label>
              <CurrencyInput id="amount" value={amount} onChange={setAmount} className="h-12 text-2xl font-semibold" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value || todayIso())} className="h-12" />
            </div>
          </div>

          {needsCategory && (
            <div className="space-y-2">
              <Label>Categoria</Label>
              <div className="flex flex-wrap gap-2">
                {visibleCategories.map(c => (
                  <ChoiceChip key={c.id} selected={categoryId === c.id} onClick={() => setCategoryId(c.id)} className="pl-1">
                    <TokenIcon icon={c.icon} color={c.color} size="sm" />
                    {c.name}
                  </ChoiceChip>
                ))}
              </div>
            </div>
          )}

          {needsWallet && (
            <div className="space-y-2">
              <Label>{walletQuestion}</Label>
              <div className="flex flex-wrap gap-2">
                {wallets
                  .filter(w => mode !== 'save' || w.type !== 'credit')
                  .map(w => (
                    <ChoiceChip key={w.id} selected={walletId === w.id} onClick={() => setWalletId(w.id)} className="pl-1">
                      <TokenIcon icon={WALLET_TYPE_ICON[w.type] ?? 'wallet'} color="gray" size="sm" />
                      {walletLabel(w)}
                    </ChoiceChip>
                  ))}
              </div>
            </div>
          )}

          {isCredit && (
            <div className="space-y-2">
              <Label htmlFor="installments">Parcelas</Label>
              <Input
                id="installments"
                type="number"
                inputMode="numeric"
                min={1}
                max={48}
                value={installments}
                onChange={e => setInstallments(Math.min(48, Math.max(1, Number(e.target.value) || 1)))}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="place">{placeLabel}</Label>
            <Input id="place" value={place} onChange={e => setPlace(e.target.value)} placeholder={placePlaceholder} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" size="lg" className="w-full" disabled={!canSubmit}>
            {submitting ? 'Registrando...' : 'Registrar'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
