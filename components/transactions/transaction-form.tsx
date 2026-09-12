'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
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
import type { TransactionType } from '@/lib/types'
import { currentMonth } from '@/lib/utils'

interface TransactionFormProps {
  id?: string
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function TransactionForm({ id }: TransactionFormProps) {
  const router = useRouter()
  const { transactions, loading, create, update, remove } = useTransactions(currentMonth())
  const { accounts } = useAccounts()
  const existing = useMemo(() => transactions.find(t => t.id === id), [transactions, id])

  const [type, setType] = useState<Exclude<TransactionType, 'transfer'>>('expense')
  const [amount, setAmount] = useState(0)
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(today())
  const [accountId, setAccountId] = useState<string>('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!existing) return
    if (existing.type !== 'transfer') setType(existing.type)
    setAmount(existing.amount)
    setDescription(existing.description)
    setDate(existing.date)
    setAccountId(existing.accountId)
    setCategoryId(existing.categoryId)
    setNotes(existing.notes ?? '')
  }, [existing])

  useEffect(() => {
    if (!existing && !accountId && accounts.length > 0) {
      setAccountId(accounts[0].id)
    }
  }, [existing, accountId, accounts])

  if (id && loading) {
    return <p className="text-sm text-muted-foreground">Carregando...</p>
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim()) {
      setError('Descreva o lançamento.')
      return
    }
    if (!accountId) {
      setError('Escolha uma conta.')
      return
    }
    if (amount <= 0) {
      setError('Informe um valor maior que zero.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
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
        notes: notes.trim() || null,
      }
      if (existing) {
        await update({ id: existing.id, ...payload })
      } else {
        await create(payload)
      }
      router.push('/transactions')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar lançamento')
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
      router.push('/transactions')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao excluir lançamento')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-4">
          <Tabs value={type} onValueChange={v => setType(v as Exclude<TransactionType, 'transfer'>)}>
            <TabsList className="w-full">
              <TabsTrigger value="expense" className="flex-1">Despesa</TabsTrigger>
              <TabsTrigger value="income" className="flex-1">Receita</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-1.5">
            <Label htmlFor="amount">Valor</Label>
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

          <div className="space-y-1.5">
            <Label htmlFor="date">Data</Label>
            <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="account">Conta</Label>
            <Select value={accountId} onValueChange={v => setAccountId(v ?? '')}>
              <SelectTrigger id="account" className="w-full">
                <SelectValue placeholder="Selecionar conta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.filter(a => !a.archived).map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <CategoryPicker type={type} value={categoryId ?? undefined} onChange={setCategoryId} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas</Label>
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
          {existing ? 'Salvar' : 'Lançar'}
        </Button>
        {existing && (
          <Button type="button" variant="destructive" disabled={submitting} onClick={handleDelete}>
            Excluir
          </Button>
        )}
      </div>
    </form>
  )
}
