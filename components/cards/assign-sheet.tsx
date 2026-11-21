'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { ModalSheet } from '@/components/ios/modal-sheet'
import { MemberAvatar } from '@/components/family/member-avatar'
import { useRefresh } from '@/hooks/use-refresh'
import { familyApi } from '@/lib/api/family'
import type { FamilyMember, Transaction } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { feedback } from '@/lib/feedback'

// ATR-2: "De quem é a compra?" (titular). ATR-4: vale para as parcelas em aberto.
export function AssignSheet({
  transaction, people, me, onClose, onSplit,
}: { transaction: Transaction | null; people: FamilyMember[]; me?: string; onClose: () => void; onSplit?: (t: Transaction) => void }) {
  const refresh = useRefresh()
  const [error, setError] = useState<string | null>(null)

  async function assign(userId: string) {
    if (!transaction) return
    setError(null)
    try { await familyApi.assignPurchase(transaction.id, userId); await refresh(); onClose(); feedback.done('Salvo') }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível alterar.') }
  }

  return (
    <ModalSheet open={!!transaction} onOpenChange={o => { if (!o) onClose() }} title="De quem é a compra?">
      {transaction && (
        <>
          <p className="text-center text-subheadline text-muted-foreground">
            {transaction.place || transaction.description || 'Compra'} · {formatCurrency(transaction.amount)}
            {transaction.installmentsTotal ? ` · vale para as parcelas em aberto` : ''}
          </p>
          <ListGroup>
            {people.map(p => (
              <ListRow key={p.userId} onClick={() => assign(p.userId)}
                leading={<MemberAvatar name={p.name} color={p.avatarColor} />}
                title={p.userId === me ? 'Você' : p.name}
                trailing={transaction.owner === p.userId ? '✓' : undefined} />
            ))}
          </ListGroup>
          {error && <p className="px-4 text-footnote text-destructive">{error}</p>}
          {onSplit && !transaction.installmentGroupId && people.length > 1 && (
            <Button type="button" variant="secondary" size="lg" className="w-full" onClick={() => onSplit(transaction)}>
              Dividir entre pessoas
            </Button>
          )}
        </>
      )}
    </ModalSheet>
  )
}
