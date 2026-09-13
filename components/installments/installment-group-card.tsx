'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { InstallmentGroup } from '@/lib/types'
import { formatCurrency, effectivePaidCount } from '@/lib/utils'

interface InstallmentGroupCardProps {
  group: InstallmentGroup
  onClick?: () => void
}

const STATUS_LABELS: Record<InstallmentGroup['status'], string> = {
  active: 'Ativo',
  paid_off: 'Quitado',
  cancelled: 'Cancelado',
}

export function InstallmentGroupCard({ group, onClick }: InstallmentGroupCardProps) {
  const paidCount = effectivePaidCount(group.paidCount, group.installmentCount, group.startDate)

  return (
    <button type="button" onClick={onClick} className="w-full text-left">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-medium">{group.description}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {paidCount}/{group.installmentCount} pagas ·{' '}
                {formatCurrency(group.installmentAmount)}/mês
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
