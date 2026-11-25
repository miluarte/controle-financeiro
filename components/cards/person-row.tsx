'use client'

import { MemberAvatar } from '@/components/family/member-avatar'
import { ListRow } from '@/components/ios/list-row'
import type { PersonGroup } from '@/hooks/use-card-invoices'
import { formatDate, walletLabel } from '@/lib/utils'
import { InvoiceStatus, PixStatus } from './invoice-status'
import { Money } from '@/components/shared/money'

// Uma pessoa na aba Cartões: soma das faturas de todos os cartões dela (ou meus, no caso de quem me deve)
// e dos Pix divididos com ela.
export function PersonRow({ group: g, kind, onClick }: { group: PersonGroup; kind: 'owe' | 'receive'; onClick: () => void }) {
  const pix = g.pix.length === 0 ? null : g.pix.length === 1 ? `Pix${g.pix[0].place ? ` ${g.pix[0].place}` : ''}` : `${g.pix.length} Pix`
  let subtitle: React.ReactNode
  if (g.invoices.length) {
    // a fatura que importa agora: a primeira ainda em aberto (ou a última, se tudo foi pago)
    const next = g.invoices.find(i => i.debt.open > 0) ?? g.invoices[g.invoices.length - 1]
    const cards = new Set(g.invoices.map(i => i.wallet.id)).size
    const what = cards === 1 ? walletLabel(next.wallet) : `${cards} cartões`
    subtitle = (
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="truncate">{what} · vence {formatDate(next.debt.dueDate).slice(0, 5)}{pix ? ` · ${pix}` : ''}</span>
        <InvoiceStatus debt={next.debt} kind={kind} />
      </span>
    )
  } else {
    const next = g.pix.find(d => d.open > 0) ?? g.pix[g.pix.length - 1]
    subtitle = (
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="truncate">{pix}</span>
        <PixStatus debt={next} kind={kind} />
      </span>
    )
  }
  return (
    <ListRow
      onClick={onClick}
      leading={<MemberAvatar name={g.name} color={g.color} size="md" />}
      title={g.name}
      subtitle={subtitle}
      trailing={
        <Money cents={g.open > 0 ? g.open : g.total} tone={kind === 'receive' && g.open > 0 ? 'success' : 'default'} />
      }
      chevron
    />
  )
}
