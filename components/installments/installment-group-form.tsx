'use client'

import { useEffect, useState } from 'react'
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
import { CategoryPicker } from '@/components/categories/category-picker'
import { useInstallments } from '@/hooks/use-installments'
import { useAccounts } from '@/hooks/use-accounts'
import { formatCurrency } from '@/lib/utils'

interface InstallmentGroupFormProps {
  onSuccess?: () => void
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function InstallmentGroupForm({ onSuccess }: InstallmentGroupFormProps) {
  const { create } = useInstallments()
  const { accounts } = useAccounts()

  const [description, setDescription] = useState('')
  const [totalAmount, setTotalAmount] = useState(0)
  const [installmentCount, setInstallmentCount] = useState('2')
  const [accountId, setAccountId] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [startDate, setStartDate] = useState(today())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const active = accounts.filter(a => !a.archived)
  const count = Math.max(1, Number(installmentCount) || 1)
  const installmentAmount = totalAmount > 0 ? Math.round(totalAmount / count) : 0

  useEffect(() => {
    if (!accountId && active.length > 0) setAccountId(active[0].id)
  }, [active, accountId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim()) {
      setError('Descreva a compra.')
      return
    }
    if (!accountId) {
      setError('Escolha o cartão ou conta.')
      return
    }
    if (totalAmount <= 0) {
      setError('Informe um valor total maior que zero.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await create({
        description: description.trim(),
        totalAmount,
        installmentCount: count,
        installmentAmount,
        accountId,
        categoryId,
        startDate,
      })
      setDescription('')
      setTotalAmount(0)
      setInstallmentCount('2')
      onSuccess?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao lançar parcelamento')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="installment-description">Descrição</Label>
            <Input
              id="installment-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ex: Notebook, Geladeira"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="totalAmount">Valor total da compra</Label>
            <CurrencyInput id="totalAmount" value={totalAmount} onChange={setTotalAmount} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="installmentCount">Número de parcelas</Label>
            <Input
              id="installmentCount"
              type="number"
              min={1}
              max={48}
              value={installmentCount}
              onChange={e => setInstallmentCount(e.target.value)}
            />
            {totalAmount > 0 && (
              <p className="text-xs text-muted-foreground">
                {count}x de {formatCurrency(installmentAmount)}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="installment-account">Cartão / conta</Label>
            <Select value={accountId} onValueChange={v => setAccountId(v ?? '')}>
              <SelectTrigger id="installment-account" className="w-full">
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                {active.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <CategoryPicker type="expense" value={categoryId ?? undefined} onChange={setCategoryId} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="startDate">Data da primeira parcela</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={submitting} className="w-full">
        Lançar parcelamento
      </Button>
    </form>
  )
}
