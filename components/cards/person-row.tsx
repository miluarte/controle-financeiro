'use client'

import { MemberAvatar } from '@/components/family/member-avatar'
import { ListRow } from '@/components/ios/list-row'
import type { PersonGroup } from '@/hooks/use-card-invoices'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { InvoiceStatus } from './invoice-status'

// Uma pessoa na aba Cartões: soma das faturas de todos os cartões dela (ou meus, no caso de quem me deve).
export function PersonRow({ group: g, kind, onClick }: { group: PersonGroup; kind: 'owe' | 'receive'; onClick: () => void }) {
  // a fatura que importa agora: a primeira ainda em aberto (ou a última, se tudo foi pago)
  const next = g.invoices.find(i => i.debt.open > 0) ?? g.invoices[g.invoices.length - 1]
  const cards = new Set(g.invoices.map(i => i.wallet.id)).size
  const what = cards === 1 ? next.wallet.name : `${cards} cartões`
  return (
    <ListRow
      onClick={onClick}
      leading={<MemberAvatar name={g.name} color={g.color} size="md" />}
      title={g.name}
      subtitle={
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate">{what} · vence {formatDate(next.debt.dueDate).slice(0, 5)}</span>
          <InvoiceStatus debt={next.debt} kind={kind} />
        </span>
      }
      trailing={
        <span className={cn('text-body font-semibold tabular-nums', kind === 'receive' && g.open > 0 ? 'text-success' : 'text-foreground')}>
          {formatCurrency(g.open > 0 ? g.open : g.total)}
        </span>
      }
      chevron
    />
  )
}
