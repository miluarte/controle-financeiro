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
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const active = accounts.filter(a => !a.archived)

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
        notes: null,
      })
      router.push('/transactions')
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
            <Select value={fromAccountId} onValueChange={setFromAccountId}>
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
            <Select value={toAccountId} onValueChange={setToAccountId}>
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

          <div className="space-y-1.5">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Opcional"
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
