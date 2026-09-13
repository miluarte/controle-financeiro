'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TokenIcon } from '@/components/shared/token-icon'
import type { Account } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'

interface AccountCardProps {
  account: Account
}

export const ACCOUNT_TYPE_LABELS: Record<Account['type'], string> = {
  checking: 'Conta corrente',
  savings: 'Poupança',
  credit_card: 'Cartão de crédito',
  cash: 'Dinheiro',
}

export function AccountCard({ account }: AccountCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <TokenIcon icon={account.icon} color={account.color} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{account.name}</p>
          <Badge variant="secondary" className="mt-0.5 text-xs">
            {ACCOUNT_TYPE_LABELS[account.type]}
          </Badge>
        </div>
        <p className={`shrink-0 text-base font-semibold ${account.currentBalance < 0 ? 'text-destructive' : ''}`}>
          {formatCurrency(account.currentBalance)}
        </p>
      </CardContent>
    </Card>
  )
}
