'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CurrencyInput } from '@/components/shared/currency-input'
import { CategoryPicker } from '@/components/categories/category-picker'
import { useTransactions } from '@/hooks/use-transactions'
import { useAccounts } from '@/hooks/use-accounts'
import { installmentsApi } from '@/lib/api/installments'
import { recurringApi } from '@/lib/api/recurring'
import type { Transaction, TransactionType, RecurrenceFrequency, PaymentMethod } from '@/lib/types'
import { currentMonth, formatCurrency } from '@/lib/utils'

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix:    'Pix',
  debit:  'Débito',
  boleto: 'Boleto',
  ted:    'TED/DOC',
}

const FREQUENCY_LABELS: Record<RecurrenceFrequency, string> = {
  daily:    'Diário',
  weekly:   'Semanal',
  biweekly: 'Quinzenal',
  monthly:  'Mensal',
  yearly:   'Anual',
}

interface TransactionFormProps {
  id?: string
  initialTransaction?: Transaction
  onSuccess?: () => void
}

function today(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function calculateCardDueDate(closingDay: number, dueDay: number): string {
  const now = new Date()
  const monthsAhead = now.getDate() <= closingDay ? 1 : 2
  const due = new Date(now.getFullYear(), now.getMonth() + monthsAhead, dueDay)
  return due.toISOString().slice(0, 10)
}

export function TransactionForm({ id, initialTransaction, onSuccess }: TransactionFormProps) {
  const router = useRouter()
  const { transactions, loading, create, update, remove } = useTransactions(currentMonth())
  const { accounts } = useAccounts()

  // Quando initialTransaction é passado, já está disponível no primeiro render.
  // Quando id é passado, a transação é buscada na lista carregada pelo hook.
  const fromId = useMemo(
    () => transactions.find(t => t.id === id),
    [transactions, id],
  )
  const existing = initialTransaction ?? fromId
  const activeAccounts = useMemo(() => accounts.filter(a => !a.archived), [accounts])

  // Lazy init: inicializa do initialTransaction imediatamente (sem esperar useEffect)
  // Para o caso de id, o useEffect abaixo preenche quando a lista carregar.
  const tx = initialTransaction
  const [type, setType] = useState<Exclude<TransactionType, 'transfer'>>(
    () => tx && tx.type !== 'transfer' ? tx.type : 'expense',
  )
  const [amount, setAmount]         = useState(() => tx?.amount ?? 0)
  const [description, setDescription] = useState(() => tx?.description ?? '')
  const [date, setDate]             = useState(() => tx?.date ?? today())
  const [accountId, setAccountId]   = useState(() => tx?.accountId ?? '')
  const [categoryId, setCategoryId] = useState<string | null>(() => tx?.categoryId ?? null)
  const [notes, setNotes]           = useState(() => tx?.notes ?? '')
  const [purchaseDate, setPurchaseDate] = useState(() => tx?.purchaseDate ?? '')
  const [merchant, setMerchant]     = useState(() => tx?.merchant ?? '')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)
  const [parcelado, setParcelado]   = useState(false)
  const [installmentCount, setInstallmentCount] = useState('2')
  const [recorrente, setRecorrente] = useState(false)
  const [frequency, setFrequency]   = useState<RecurrenceFrequency>('monthly')
  const [endDate, setEndDate]       = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const count = Math.max(2, Number(installmentCount) || 2)
  const installmentAmount = amount > 0 ? Math.round(amount / count) : 0

  const selectedAccount = useMemo(() => accounts.find(a => a.id === accountId), [accounts, accountId])
  const showPaymentMethod = type === 'expense' && (selectedAccount?.type === 'checking' || selectedAccount?.type === 'savings')

  const isInstallmentTx = !!(existing?.installmentGroupId)
  const isRecurringTx = !!(existing?.recurringGroupId)
  const isExisting = !!existing

  // Preenche o form quando a transação é buscada por id (lista do mês corrente)
  useEffect(() => {
    if (!fromId || initialTransaction) return
    if (fromId.type !== 'transfer') setType(fromId.type)
    setAmount(fromId.amount)
    setDescription(fromId.description)
    setDate(fromId.date)
    setAccountId(fromId.accountId)
    setCategoryId(fromId.categoryId)
    setNotes(fromId.notes ?? '')
    setPurchaseDate(fromId.purchaseDate ?? '')
    setMerchant(fromId.merchant ?? '')
    setPaymentMethod(fromId.paymentMethod ?? null)
  }, [fromId, initialTransaction])

  // Conta padrão ao criar
  useEffect(() => {
    if (isExisting || accountId || activeAccounts.length === 0) return
    setAccountId(activeAccounts[0].id)
  }, [isExisting, accountId, activeAccounts])

  // Auto-data ao selecionar cartão de crédito (só na criação)
  useEffect(() => {
    if (isExisting || !accountId) return
    const account = accounts.find(a => a.id === accountId)
    if (account?.type === 'credit_card' && account.closingDay && account.dueDay) {
      setDate(calculateCardDueDate(account.closingDay, account.dueDay))
    }
  }, [accountId, accounts, isExisting])

  const handleParceladoChange = (v: boolean) => { setParcelado(v); if (v) setRecorrente(false) }
  const handleRecorrenteChange = (v: boolean) => { setRecorrente(v); if (v) setParcelado(false) }
  useEffect(() => { if (type !== 'expense') setParcelado(false) }, [type])
  useEffect(() => {
    if (type !== 'expense') { setPurchaseDate(''); setMerchant('') }
  }, [type])

  const done = () => {
    if (onSuccess) {
      onSuccess()
    } else {
      // window.location força reload completo, garantindo dados frescos do backend
      window.location.href = '/dashboard'
    }
  }

  if (id && !initialTransaction && loading) {
    return <p className="text-sm text-muted-foreground">Carregando...</p>
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim()) { setError('Descreva a transação.'); return }
    if (!accountId) { setError('Escolha uma conta.'); return }
    if (amount <= 0) { setError('Informe um valor maior que zero.'); return }

    setSubmitting(true)
    setError(null)
    try {
      if (parcelado && !isExisting) {
        await installmentsApi.create({
          description: description.trim(),
          totalAmount: amount,
          installmentCount: count,
          installmentAmount,
          accountId,
          categoryId,
          startDate: date,
        })
      } else if (recorrente && !isExisting) {
        // Tenta criar o grupo recorrente, mas não bloqueia se falhar.
        let recurringGroupId: string | null = null
        let backendCreatedCurrentMonth = false
        try {
          const result = await recurringApi.create({
            type,
            description: description.trim(),
            amount,
            accountId,
            categoryId,
            frequency,
            startDate: date,
            endDate: endDate.trim() || null,
            active: true,
            notes: notes.trim() || null,
          })
          recurringGroupId = (result as any)?.group?.id ?? (result as any)?.id ?? null
          backendCreatedCurrentMonth = Array.isArray((result as any)?.transactions)
            && (result as any).transactions.some(
              (tx: any) => String(tx.date ?? '').slice(0, 7) === currentMonth(),
            )
        } catch {
          // Recorrência falhou — ainda criamos a transação do mês atual abaixo.
        }
        // Garante que o mês atual sempre apareça na lista.
        if (!backendCreatedCurrentMonth) {
          await create({
            type,
            amount,
            description: description.trim(),
            date,
            accountId,
            toAccountId: null,
            categoryId,
            installmentGroupId: null,
            installmentNumber: null,
            installmentTotal: null,
            recurringGroupId,
            purchaseDate: null,
            merchant: null,
            paymentMethod: showPaymentMethod ? paymentMethod : null,
            notes: notes.trim() || null,
          })
        }
      } else {
        const payload = {
          type,
          amount,
          description: description.trim(),
          date,
          accountId,
          toAccountId: null,
          categoryId,
          installmentGroupId: existing?.installmentGroupId ?? null,
          installmentNumber: existing?.installmentNumber ?? null,
          installmentTotal: existing?.installmentTotal ?? null,
          recurringGroupId: existing?.recurringGroupId ?? null,
          purchaseDate: purchaseDate.trim() || null,
          merchant: merchant.trim() || null,
          paymentMethod: showPaymentMethod ? paymentMethod : null,
          notes: notes.trim() || null,
        }
        if (existing) {
          await update({ id: existing.id, ...payload })
        } else {
          await create(payload)
        }
      }
      done()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar transação')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!existing) return
    setSubmitting(true)
    setError(null)
    try {
      await remove(existing.id)
      done()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir transação')
      setSubmitting(false)
    }
  }

  const dateLabel = parcelado ? 'Data da primeira parcela' : recorrente ? 'Início' : 'Data do lançamento'
  const submitLabel = isExisting
    ? 'Salvar'
    : parcelado
      ? 'Lançar parcelamento'
      : recorrente
        ? 'Criar recorrência'
        : 'Lançar'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-4">

          {isInstallmentTx ? (
            <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              Parcela {existing.installmentNumber}/{existing.installmentTotal}
            </div>
          ) : isRecurringTx ? (
            <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              Lançamento recorrente
            </div>
          ) : (
            <Tabs value={type} onValueChange={v => setType(v as Exclude<TransactionType, 'transfer'>)}>
              <TabsList className="w-full">
                <TabsTrigger value="expense" className="flex-1">Despesa</TabsTrigger>
                <TabsTrigger value="income" className="flex-1">Receita</TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="amount">{parcelado ? 'Valor total da compra' : 'Valor'}</Label>
            <CurrencyInput id="amount" value={amount} onChange={setAmount} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ex: Mercado, Uber, Salário"
            />
          </div>

          {!isExisting && (
            <>
              {type === 'expense' && (
                <div className="flex items-center justify-between">
                  <Label htmlFor="parcelado" className="cursor-pointer">Parcelado</Label>
                  <Switch id="parcelado" checked={parcelado} onCheckedChange={handleParceladoChange} />
                </div>
              )}
              <div className="flex items-center justify-between">
                <Label htmlFor="recorrente" className="cursor-pointer">Recorrente / Conta fixa</Label>
                <Switch id="recorrente" checked={recorrente} onCheckedChange={handleRecorrenteChange} />
              </div>
            </>
          )}

          {parcelado && (
            <div className="space-y-1.5">
              <Label htmlFor="installmentCount">Número de parcelas</Label>
              <Input
                id="installmentCount"
                type="number"
                min={2}
                max={48}
                value={installmentCount}
                onChange={e => setInstallmentCount(e.target.value)}
              />
              {amount > 0 && (
                <p className="text-xs text-muted-foreground">
                  {count}x de {formatCurrency(installmentAmount)}
                </p>
              )}
            </div>
          )}

          {recorrente && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="frequency">Frequência</Label>
                <Select value={frequency} onValueChange={v => setFrequency(v as RecurrenceFrequency)}>
                  <SelectTrigger id="frequency" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(FREQUENCY_LABELS) as [RecurrenceFrequency, string][]).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endDate">Encerra em (opcional)</Label>
                <Input id="endDate" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </>
          )}

          {/* Conta primeiro para que o auto-calc do cartão já apareça preenchido na data */}
          <div className="space-y-1.5">
            <Label htmlFor="account">Conta</Label>
            <Select value={accountId} onValueChange={v => setAccountId(v ?? '')}>
              <SelectTrigger id="account" className="w-full">
                <SelectValue placeholder="Selecionar conta" />
              </SelectTrigger>
              <SelectContent>
                {activeAccounts.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showPaymentMethod && (
            <div className="space-y-1.5">
              <Label htmlFor="paymentMethod">Método de pagamento <span className="text-muted-foreground">(opcional)</span></Label>
              <Select
                value={paymentMethod ?? ''}
                onValueChange={v => setPaymentMethod((v || null) as PaymentMethod | null)}
              >
                <SelectTrigger id="paymentMethod" className="w-full">
                  <SelectValue placeholder="Selecionar método" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, string][]).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="date">{dateLabel}</Label>
            <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Categoria <span className="text-muted-foreground">(opcional)</span></Label>
            <CategoryPicker type={type} value={categoryId ?? undefined} onChange={setCategoryId} />
          </div>

          {type === 'expense' && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="purchaseDate">Data da compra <span className="text-muted-foreground">(opcional)</span></Label>
                <Input
                  id="purchaseDate"
                  type="date"
                  value={purchaseDate}
                  onChange={e => setPurchaseDate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="merchant">Local da compra <span className="text-muted-foreground">(opcional)</span></Label>
                <Input
                  id="merchant"
                  value={merchant}
                  onChange={e => setMerchant(e.target.value)}
                  placeholder="Ex: Supermercado Pão de Açúcar"
                />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas <span className="text-muted-foreground">(opcional)</span></Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Opcional"
            />
          </div>

        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={submitting} className="flex-1">
          {submitLabel}
        </Button>
        {isExisting && (
          <Button type="button" variant="destructive" disabled={submitting} onClick={handleDelete}>
            Excluir
          </Button>
        )}
      </div>
    </form>
  )
}
