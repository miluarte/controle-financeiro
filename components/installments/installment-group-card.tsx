'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { InstallmentGroup } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'

interface InstallmentGroupCardProps {
  group: InstallmentGroup
}

const STATUS_LABELS: Record<InstallmentGroup['status'], string> = {
  active: 'Ativo',
  paid_off: 'Quitado',
  cancelled: 'Cancelado',
}

export function InstallmentGroupCard({ group }: InstallmentGroupCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium">{group.description}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {group.paidCount}/{group.installmentCount} parcelas ·{' '}
              {formatCurrency(group.installmentAmount)}/mês
            </p>
          </div>
          <Badge
            variant={group.status === 'active' ? 'default' : 'secondary'}
            className="ml-2 shrink-0"
          >
            {STATUS_LABELS[group.status]}
          </Badge>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Total: {formatCurrency(group.totalAmount)}
        </p>
      </CardContent>
    </Card>
  )
}
