'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CurrencyInput } from '@/components/shared/currency-input'
import { useTransactions } from '@/hooks/use-transactions'
import { useAccounts } from '@/hooks/use-accounts'
import { currentMonth } from '@/lib/utils'
import type { PaymentMethod } from '@/lib/types'

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix:    'Pix',
  debit:  'Débito',
  boleto: 'Boleto',
  ted:    'TED/DOC',
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function TransferForm() {
  const router = useRouter()
  const { accounts } = useAccounts()
  const { create } = useTransactions(currentMonth())

  const [fromAccountId, setFromAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [amount, setAmount] = useState(0)
  const [date, setDate] = useState(today())
  const [description, setDescription] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const active = accounts.filter(a => !a.archived)
  const accountItems = Object.fromEntries(active.map(a => [a.id, a.name]))
  const fromAccount = active.find(a => a.id === fromAccountId)
  const showPaymentMethod = fromAccount?.type === 'checking' || fromAccount?.type === 'savings'

  useEffect(() => {
    if (!fromAccountId && active.length > 0) setFromAccountId(active[0].id)
    if (!toAccountId && active.length > 1) setToAccountId(active[1].id)
  }, [active, fromAccountId, toAccountId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fromAccountId || !toAccountId) {
      setError('Escolha as duas contas.')
      return
    }
    if (fromAccountId === toAccountId) {
      setError('A conta de origem e destino precisam ser diferentes.')
      return
    }
    if (amount <= 0) {
      setError('Informe um valor maior que zero.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await create({
        type: 'transfer',
        amount,
        description: description.trim() || 'Transferência entre contas',
        date,
        accountId: fromAccountId,
        toAccountId,
        categoryId: null,
        installmentGroupId: null,
        installmentNumber: null,
        installmentTotal: null,
        recurringGroupId: null,
        purchaseDate: null,
        merchant: null,
        paymentMethod: showPaymentMethod ? paymentMethod : null,
        paid: false,
        notes: null,
      })
      router.push('/dashboard')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao transferir')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="fromAccount">De</Label>
            <Select
              value={fromAccountId}
              onValueChange={v => setFromAccountId(v ?? '')}
              items={accountItems}
            >
              <SelectTrigger id="fromAccount" className="w-full">
                <SelectValue placeholder="Conta de origem" />
              </SelectTrigger>
              <SelectContent>
                {active.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="toAccount">Para</Label>
            <Select
              value={toAccountId}
              onValueChange={v => setToAccountId(v ?? '')}
              items={accountItems}
            >
              <SelectTrigger id="toAccount" className="w-full">
                <SelectValue placeholder="Conta de destino" />
              </SelectTrigger>
              <SelectContent>
                {active.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="amount">Valor</Label>
            <CurrencyInput id="amount" value={amount} onChange={setAmount} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="date">Data</Label>
            <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} />
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
            <Label htmlFor="description">Descrição <span className="text-muted-foreground">(opcional)</span></Label>
            <Input
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ex: Reserva de emergência"
            />
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={submitting} className="w-full">
        Transferir
      </Button>
    </form>
  )
}
