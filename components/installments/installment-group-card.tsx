'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { InstallmentGroup } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'

interface InstallmentGroupCardProps {
  group: InstallmentGroup
  selectedMonth?: string
  onClick?: () => void
}

const STATUS_LABELS: Record<InstallmentGroup['status'], string> = {
  active: 'Ativo',
  paid_off: 'Quitado',
  cancelled: 'Cancelado',
}

function installmentNumberForMonth(group: InstallmentGroup, ym: string): number {
  const start = new Date(group.startDate.slice(0, 10) + 'T12:00:00')
  const [y, m] = ym.split('-').map(Number)
  return (y - start.getFullYear()) * 12 + (m - 1 - start.getMonth()) + 1
}

export function InstallmentGroupCard({ group, selectedMonth, onClick }: InstallmentGroupCardProps) {
  const installmentNumber = selectedMonth ? installmentNumberForMonth(group, selectedMonth) : null

  return (
    <button type="button" onClick={onClick} className="w-full text-left">
      <Card>
        <CardContent>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-medium">{group.description}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {installmentNumber !== null
                  ? `Parcela ${installmentNumber}/${group.installmentCount}`
                  : `${group.installmentCount} parcelas`}{' '}
                · {formatCurrency(group.installmentAmount)}/mês
              </p>
            </div>
            <Badge
              variant={group.status === 'active' ? 'default' : 'secondary'}
              className="shrink-0"
            >
              {STATUS_LABELS[group.status]}
            </Badge>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Total: {formatCurrency(group.totalAmount)}
          </p>
        </CardContent>
      </Card>
    </button>
  )
}
