'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { CurrencyInput } from '@/components/shared/currency-input'
import { CategoryPicker } from '@/components/categories/category-picker'
import { useBudgetGoals } from '@/hooks/use-budget-goals'
import { currentMonth } from '@/lib/utils'

interface BudgetGoalFormProps {
  onSuccess?: () => void
}

export function BudgetGoalForm({ onSuccess }: BudgetGoalFormProps) {
  const { create } = useBudgetGoals()
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [monthlyLimit, setMonthlyLimit] = useState(0)
  const [isRecurring, setIsRecurring] = useState(true)
  const [month, setMonth] = useState(currentMonth())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!categoryId) {
      setError('Escolha uma categoria.')
      return
    }
    if (monthlyLimit <= 0) {
      setError('Informe um limite maior que zero.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await create({
        categoryId,
        monthlyLimit,
        isRecurring,
        month: isRecurring ? null : month,
      })
      onSuccess?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao criar meta')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Categoria</Label>
        <CategoryPicker type="expense" value={categoryId ?? undefined} onChange={setCategoryId} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="monthlyLimit">Limite mensal</Label>
        <CurrencyInput id="monthlyLimit" value={monthlyLimit} onChange={setMonthlyLimit} />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="isRecurring">Repetir todo mês</Label>
        <Switch id="isRecurring" checked={isRecurring} onCheckedChange={setIsRecurring} />
      </div>

      {!isRecurring && (
        <div className="space-y-1.5">
          <Label htmlFor="month">Mês</Label>
          <Input id="month" type="month" value={month} onChange={e => setMonth(e.target.value)} />
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={submitting} className="w-full">
        Criar meta
      </Button>
    </form>
  )
}
