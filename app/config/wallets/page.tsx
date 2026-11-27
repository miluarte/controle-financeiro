'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AddLinearIcon } from '@solar-icons/react'
import { GlassButton } from '@/components/ios/glass-button'
import { LargeTitleHeader } from '@/components/ios/large-title-header'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { CardPreview } from '@/components/wallets/card-preview'
import { WalletFormSheet } from '@/components/wallets/wallet-form-sheet'
import { useInvoices, useOwnWallets } from '@/hooks/use-data'
import { useMonth } from '@/hooks/use-month'
import { useMonthTransactions } from '@/hooks/use-month-transactions'
import { useProfile } from '@/hooks/use-profile'
import { useWallets } from '@/hooks/use-wallets'
import { openInvoiceRef } from '@/lib/invoice'
import type { OwnWallet } from '@/lib/types'
import { addMonths, currentMonth, formatCurrency, monthName, todayIso, walletLabel } from '@/lib/utils'
import { walletsApi } from '@/lib/api/wallets'
import { useConfirmDelete } from '@/components/ios/use-delete-action'

export default function WalletsPage() {
  const { month } = useMonth()
  const { wallets } = useOwnWallets()
  const { wallets: usable } = useWallets()
  const { profile } = useProfile()
  const { transactions } = useMonthTransactions(month)
  const { totals } = useInvoices(currentMonth())
  const router = useRouter()
  const del = useConfirmDelete()
  const askDelete = (w: { id: string; name: string }) => del.ask({ title: `Excluir "${w.name}"?`, remove: () => walletsApi.remove(w.id) })
  const [editing, setEditing] = useState<OwnWallet | null>(null)
  const [creating, setCreating] = useState(false)

  const spentBy = new Map<string, number>()
  for (const t of transactions) {
    if (t.type === 'expense' && t.walletId) spentBy.set(t.walletId, (spentBy.get(t.walletId) ?? 0) + t.amount)
  }
  const invoiceTotal = (walletId: string, ref: string) =>
    totals.filter(t => t.walletId === walletId && t.invoiceRef.slice(0, 7) === ref).reduce((s, t) => s + t.total - t.prepaid, 0)

  const active = wallets.filter(w => w.active)
  const cards = active.filter(w => w.type === 'credit')
  const others = active.filter(w => w.type !== 'credit')
  const archived = wallets.filter(w => !w.active)
  const shared = usable.filter(w => w.ownerName)

  const open = (w: OwnWallet) => setEditing(w)

  return (
    <>
      <LargeTitleHeader title="Carteiras" actions={
        <GlassButton aria-label="Adicionar carteira" onClick={() => setCreating(true)}><AddLinearIcon /></GlassButton>
      } />
      <div className="space-y-7 px-4 pt-2">
        {cards.length > 0 && (
          <ListGroup header="Cartões de crédito">
            {cards.map(w => {
              const ref = openInvoiceRef(w, todayIso())
              const current = invoiceTotal(w.id, ref)
              const next = invoiceTotal(w.id, addMonths(ref, 1))
              return (
                <ListRow key={w.id} onClick={() => router.push(`/cards/${w.id}`)} onDelete={() => askDelete(w)}
                  leading={<CardPreview name="" finish={w.finish} size="sm" className="w-11" />}
                  title={<>{walletLabel(w)}{w.shareScope !== 'none' && <span className="text-muted-foreground"> · compartilhado</span>}</>}
                  subtitle={`Fatura de ${monthName(ref, 'short')} ${formatCurrency(current)} · próxima ${formatCurrency(next)}`
                    + (w.spendingLimit ? ` · limite ${formatCurrency(w.spendingLimit)}` : '')}
                  chevron />
              )
            })}
          </ListGroup>
        )}

        <ListGroup header="Outras carteiras">
          {others.map(w => {
            const spent = spentBy.get(w.id) ?? 0
            return (
              <ListRow key={w.id} onClick={() => open(w)} onDelete={() => askDelete(w)}
                leading={<CardPreview name="" finish={w.finish} size="sm" className="w-11" />}
                title={<>{walletLabel(w)}{w.type === 'debit' && <span className="text-muted-foreground"> · débito</span>}{profile?.defaultWalletId === w.id && <span className="text-muted-foreground"> · padrão</span>}</>}
                subtitle={spent ? `${formatCurrency(spent)} em ${monthName(month, 'short')}` : `Sem gastos · ${monthName(month, 'short')}`}
                chevron />
            )
          })}
        </ListGroup>

        {shared.length > 0 && (
          <ListGroup header="Compartilhados com você">
            {shared.map(w => (
              <ListRow key={w.id} onClick={() => router.push(`/cards/${w.id}`)} chevron
                leading={<CardPreview name="" finish={w.finish} size="sm" className="w-11" />}
                title={`${walletLabel(w)}, de ${w.ownerName}`}
                subtitle={`Fecha dia ${w.closingDay} · vence dia ${w.dueDay}`} />
            ))}
          </ListGroup>
        )}

        {archived.length > 0 && (
          <ListGroup header="Arquivadas">
            {archived.map(w => (
              <ListRow key={w.id} onClick={() => open(w)} onDelete={() => askDelete(w)}
                leading={<CardPreview name="" finish={w.finish} size="sm" className="w-11 opacity-(--alpha-half)" />}
                title={<span className="text-muted-foreground">{walletLabel(w)}</span>} chevron />
            ))}
          </ListGroup>
        )}
      </div>
      {del.sheet}
      <WalletFormSheet open={creating || !!editing} wallet={editing} onClose={() => { setCreating(false); setEditing(null) }} />
    </>
  )
}
