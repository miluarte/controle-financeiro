'use client'

import { useState } from 'react'
import { useRecurringGroups } from '@/hooks/use-recurring-groups'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import { RepeatBoldDuotoneIcon } from '@solar-icons/react'

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Diária',
  weekly: 'Semanal',
  biweekly: 'Quinzenal',
  monthly: 'Mensal',
  yearly: 'Anual',
}

export function RecurringGroupList() {
  const { groups, loading, error, deactivate } = useRecurringGroups()
  const [deactivating, setDeactivating] = useState<string | null>(null)

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>
  if (error) return <p className="text-sm text-destructive">{error}</p>

  const active = groups.filter(g => g.active)

  if (active.length === 0)
    return <p className="text-sm text-muted-foreground">Nenhuma recorrência ativa.</p>

  async function handleDeactivate(id: string) {
    setDeactivating(id)
    try {
      await deactivate(id)
    } finally {
      setDeactivating(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {active.map(group => (
        <Card key={group.id}>
          <CardContent className="flex items-center gap-3 p-4">
            <RepeatBoldDuotoneIcon className="size-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{group.description}</p>
              <p className="text-xs text-muted-foreground">
                {FREQUENCY_LABELS[group.frequency]} · início {formatDate(group.startDate)}
                {group.type === 'income' ? ' · Receita' : ' · Despesa'}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <p className={`font-semibold ${group.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                {group.type === 'income' ? '+' : '-'}{formatCurrency(group.amount)}
              </p>
              <Button
                size="sm"
                variant="outline"
                disabled={deactivating === group.id}
                onClick={() => handleDeactivate(group.id)}
              >
                Desativar
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
