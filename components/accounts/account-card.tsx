'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="font-medium">{account.name}</p>
          <Badge variant="secondary" className="mt-1 text-xs">
            {ACCOUNT_TYPE_LABELS[account.type]}
          </Badge>
        </div>
        <p className="text-lg font-semibold">
          {formatCurrency(account.currentBalance)}
        </p>
      </CardContent>
    </Card>
  )
}
