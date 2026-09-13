'use client'

import { useEffect, useMemo, useState } from 'react'
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
import { ColorPicker } from '@/components/shared/color-picker'
import { IconPicker } from '@/components/shared/icon-picker'
import { ACCOUNT_TYPE_LABELS } from './account-card'
import { useAccounts } from '@/hooks/use-accounts'
import type { AccountType } from '@/lib/types'
import type { ColorToken, IconToken } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'

interface AccountFormProps {
  id?: string
}

export function AccountForm({ id }: AccountFormProps) {
  const router = useRouter()
  const { accounts, loading, create, update, archive } = useAccounts()
  const existing = useMemo(() => accounts.find(a => a.id === id), [accounts, id])

  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('checking')
  const [initialBalance, setInitialBalance] = useState(0)
  const [creditLimit, setCreditLimit] = useState(0)
  const [closingDay, setClosingDay] = useState('')
  const [dueDay, setDueDay] = useState('')
  const [color, setColor] = useState<ColorToken | null>(null)
  const [icon, setIcon] = useState<IconToken | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!existing) return
    setName(existing.name)
    setType(existing.type)
    setInitialBalance(existing.initialBalance)
    setCreditLimit(existing.creditLimit ?? 0)
    setClosingDay(existing.closingDay != null ? String(existing.closingDay) : '')
    setDueDay(existing.dueDay != null ? String(existing.dueDay) : '')
    setColor((existing.color as ColorToken) || null)
    setIcon((existing.icon as IconToken) || null)
  }, [existing])

  if (id && loading) {
    return <p className="text-sm text-muted-foreground">Carregando...</p>
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Dê um nome pra conta.')
      return
    }
    if (!color) {
      setError('Escolha uma cor.')
      return
    }
    if (!icon) {
      setError('Escolha um ícone.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        name: name.trim(),
        type,
        creditLimit: type === 'credit_card' ? creditLimit : null,
        closingDay: type === 'credit_card' && closingDay ? Number(closingDay) : null,
        dueDay: type === 'credit_card' && dueDay ? Number(dueDay) : null,
        color,
        icon,
      }
      if (existing) {
        await update({ id: existing.id, ...payload })
      } else {
        await create({ ...payload, initialBalance, archived: false })
      }
      router.push('/accounts')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar conta')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleArchive() {
    if (!existing) return
    setSubmitting(true)
    setError(null)
    try {
      await archive(existing.id)
      router.push('/accounts')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao arquivar conta')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Nubank, Carteira"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="type">Tipo</Label>
            <Select
              value={type}
              onValueChange={v => setType(v as AccountType)}
              items={ACCOUNT_TYPE_LABELS}
            >
              <SelectTrigger id="type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map(t => (
                  <SelectItem key={t} value={t}>
                    {ACCOUNT_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {existing ? (
            <div className="space-y-1.5">
              <Label>Saldo atual</Label>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(existing.currentBalance)} (saldo inicial não pode ser editado depois de criada a conta)
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="initialBalance">Saldo inicial</Label>
              <CurrencyInput id="initialBalance" value={initialBalance} onChange={setInitialBalance} />
            </div>
          )}

          {type === 'credit_card' && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="creditLimit">Limite do cartão</Label>
                <CurrencyInput id="creditLimit" value={creditLimit} onChange={setCreditLimit} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="closingDay">Dia de fechamento</Label>
                  <Input
                    id="closingDay"
                    type="number"
                    min={1}
                    max={31}
                    value={closingDay}
                    onChange={e => setClosingDay(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dueDay">Dia de vencimento</Label>
                  <Input
                    id="dueDay"
                    type="number"
                    min={1}
                    max={31}
                    value={dueDay}
                    onChange={e => setDueDay(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label>Cor</Label>
            <ColorPicker value={color} onChange={setColor} />
          </div>

          <div className="space-y-1.5">
            <Label>Ícone</Label>
            <IconPicker value={icon} onChange={setIcon} />
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={submitting} className="flex-1">
          {existing ? 'Salvar' : 'Criar conta'}
        </Button>
        {existing && !existing.archived && (
          <Button type="button" variant="destructive" disabled={submitting} onClick={handleArchive}>
            Arquivar
          </Button>
        )}
      </div>
    </form>
  )
}
