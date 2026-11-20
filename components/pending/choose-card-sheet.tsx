'use client'

import { useState } from 'react'
import { FormRow } from '@/components/ios/form-row'
import { ListGroup } from '@/components/ios/list-group'
import { ModalSheet } from '@/components/ios/modal-sheet'
import { ChoiceChip } from '@/components/shared/choice-chip'
import { TokenIcon } from '@/components/shared/token-icon'
import { useOwnWallets } from '@/hooks/use-data'
import { useRefresh } from '@/hooks/use-refresh'
import { transactionsApi } from '@/lib/api/transactions'
import type { Transaction } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'

// Titular: alguém da família registrou uma compra no seu cartão sem dizer qual. Você escolhe o cartão
// e a compra entra na fatura, no nome de quem comprou.
export function ChooseCardSheet({ transaction: t, buyer, open, onOpenChange }: {
  transaction: Transaction
  buyer: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { wallets } = useOwnWallets()
  const refresh = useRefresh()
  const cards = wallets.filter(w => w.type === 'credit' && w.active)
  const [walletId, setWalletId] = useState<string | null>(cards.length === 1 ? cards[0].id : null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const installments = typeof t.sourceData?.installments === 'number' ? t.sourceData.installments : 1
  const picked = walletId ?? (cards.length === 1 ? cards[0].id : null)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!picked) return
    setBusy(true); setError(null)
    try {
      await transactionsApi.resolveCardPending(t.id, picked)
      await refresh()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ModalSheet open={open} onOpenChange={onOpenChange} title="Qual cartão foi?" formId="choose-card"
      actionLabel="Salvar" actionDisabled={!picked || busy}>
      <form id="choose-card" onSubmit={save} className="space-y-6">
        <ListGroup>
          <FormRow label="De quem é a compra"><span className="text-muted-foreground">{buyer}</span></FormRow>
          <FormRow label={t.place || 'Compra'}>
            <span className="tabular-nums text-muted-foreground">
              {formatCurrency(t.amount)}{installments > 1 ? ` · ${installments}x` : ''}
            </span>
          </FormRow>
          <FormRow label="Data"><span className="text-muted-foreground">{formatDate(t.date)}</span></FormRow>
        </ListGroup>
        <ListGroup header="Cartão">
          <li className="flex flex-wrap gap-2 p-3">
            {cards.map(w => (
              <ChoiceChip key={w.id} selected={picked === w.id} onClick={() => setWalletId(w.id)} className="pl-1">
                <TokenIcon active={picked === w.id} icon="credit-card" color="gray" size="sm" />{w.name}
              </ChoiceChip>
            ))}
          </li>
        </ListGroup>
        {error && <p className="px-4 text-footnote text-destructive">{error}</p>}
      </form>
    </ModalSheet>
  )
}
