'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CategoryPicker } from '@/components/categories/category-picker'
import { useInstallments } from '@/hooks/use-installments'
import { useAccounts } from '@/hooks/use-accounts'
import type { InstallmentGroup } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'

const STATUS_LABELS: Record<InstallmentGroup['status'], string> = {
  active: 'Em aberto',
  paid_off: 'Quitado',
  cancelled: 'Cancelado',
}

interface InstallmentGroupEditFormProps {
  group: InstallmentGroup
  onSuccess?: () => void
}

export function InstallmentGroupEditForm({ group, onSuccess }: InstallmentGroupEditFormProps) {
  const { update, cancel } = useInstallments()
  const { accounts } = useAccounts()

  const [description, setDescription] = useState(group.description)
  const [categoryId, setCategoryId] = useState<string | null>(group.categoryId)
  const [accountId, setAccountId] = useState(group.accountId)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeAccounts = accounts.filter(a => !a.archived)
  const remaining = group.installmentCount - group.paidCount
  const isActive = group.status === 'active'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim()) { setError('Informe a descrição.'); return }
    setSubmitting(true)
    setError(null)
    try {
      await update({ id: group.id, description: description.trim(), categoryId, accountId })
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCancel() {
    if (!confirm(`Cancelar "${group.description}"? As ${remaining} parcela(s) restante(s) serão removidas.`)) return
    setSubmitting(true)
    setError(null)
    try {
      await cancel(group.id)
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cancelar')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Resumo readonly */}
      <Card>
        <CardContent className="grid grid-cols-3 gap-3 p-4 text-center">
          <div>
            <p className="text-xs text-muted-foreground">Pagas</p>
            <p className="text-lg font-semibold">{group.paidCount}/{group.installmentCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Por parcela</p>
            <p className="text-lg font-semibold">{formatCurrency(group.installmentAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-lg font-semibold">{formatCurrency(group.totalAmount)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Campos editáveis */}
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="ig-description">Descrição</Label>
            <Input
              id="ig-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              disabled={!isActive}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ig-account">Conta / Cartão</Label>
            <Select value={accountId} onValueChange={v => setAccountId(v ?? accountId)} disabled={!isActive}>
              <SelectTrigger id="ig-account" className="w-full">
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                {activeAccounts.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <CategoryPicker
              type="expense"
              value={categoryId ?? undefined}
              onChange={isActive ? setCategoryId : undefined}
            />
          </div>

          {!isActive && (
            <p className="text-sm text-muted-foreground">
              Status: {STATUS_LABELS[group.status]} — não é possível editar.
            </p>
          )}
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {isActive && (
        <>
          <Button type="submit" disabled={submitting} className="w-full">
            Salvar
          </Button>
          <Separator />
          <Button
            type="button"
            variant="destructive"
            disabled={submitting}
            onClick={handleCancel}
            className="w-full"
          >
            Cancelar parcelamento ({remaining} restante{remaining !== 1 ? 's' : ''})
          </Button>
        </>
      )}
    </form>
  )
}
