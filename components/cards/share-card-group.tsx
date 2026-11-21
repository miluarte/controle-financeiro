'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { ListGroup } from '@/components/ios/list-group'
import { SegmentedControl } from '@/components/ios/segmented-control'
import { ChoiceChip } from '@/components/shared/choice-chip'
import { MemberAvatar } from '@/components/family/member-avatar'
import { useRefresh } from '@/hooks/use-refresh'
import { familyApi } from '@/lib/api/family'
import type { FamilyMember, OwnWallet } from '@/lib/types'
import { feedback } from '@/lib/feedback'

type Scope = 'none' | 'family' | 'selected'

// CCO-1 e CCO-4: o titular compartilha o cartão com a família toda ou com membros escolhidos.
export function ShareCardGroup({ wallet, scope, members }: { wallet: OwnWallet; scope: Scope; members: FamilyMember[] }) {
  const refresh = useRefresh()
  const { data: shared, mutate } = useSWR(['card-shares', wallet.id], () => familyApi.cardShares(wallet.id))
  const [error, setError] = useState<string | null>(null)
  const selected = new Set(shared ?? [])

  async function save(next: Scope, ids: string[]) {
    setError(null)
    try { await familyApi.setCardSharing(wallet.id, next, ids); await mutate(); await refresh(); feedback.done('Salvo') }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível salvar.') }
  }

  function toggle(id: string) {
    const ids = selected.has(id) ? [...selected].filter(x => x !== id) : [...selected, id]
    save('selected', ids)
  }

  return (
    <ListGroup header="Compartilhar com a família"
      footer={error ?? 'Cada pessoa vê só as próprias compras.'}>
      <li className="space-y-3 p-3">
        <SegmentedControl<Scope> aria-label="Compartilhamento" value={scope}
          onChange={v => save(v, v === 'selected' ? [...selected] : [])}
          options={[{ value: 'none', label: 'Ninguém' }, { value: 'family', label: 'Todos' }, { value: 'selected', label: 'Escolher' }]} />
        {scope === 'selected' && (
          <div className="flex flex-wrap gap-2">
            {members.map(m => (
              <ChoiceChip key={m.userId} selected={selected.has(m.userId)} onClick={() => toggle(m.userId)} className="pl-1">
                <MemberAvatar name={m.name} color={m.avatarColor} size="sm" />{m.name}
              </ChoiceChip>
            ))}
          </div>
        )}
      </li>
    </ListGroup>
  )
}
