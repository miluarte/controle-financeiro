'use client'

import useSWR from 'swr'
import { FormRow } from '@/components/ios/form-row'
import { ListGroup } from '@/components/ios/list-group'
import { SelectField } from '@/components/shared/select-field'
import { useCardPeople } from '@/hooks/use-card-people'
import { useOwnWallets } from '@/hooks/use-data'
import { familyApi } from '@/lib/api/family'

// Quem tem acesso a um cartão próprio compartilhado. Vazio = cartão não compartilhado (só você).
export function useCardAccess(walletId: string | null) {
  const { wallets: own } = useOwnWallets()
  const { me, people } = useCardPeople()
  const wallet = own.find(w => w.id === walletId)
  const scope = wallet?.type === 'credit' ? wallet.shareScope : 'none'
  const { data: shares } = useSWR(scope === 'selected' ? ['card-shares', walletId] : null, () => familyApi.cardShares(walletId!))
  if (scope === 'none' || people.length < 2) return { me, people: [] }
  const allowed = scope === 'family' ? people : people.filter(p => p.userId === me || shares?.includes(p.userId))
  return { me, people: allowed.length > 1 ? allowed : [] }
}

// ATR-2 no registro: o titular diz de quem é a compra no cartão compartilhado. Aparece para os dois.
export function PurchaseOwnerField({ people, me, value, onChange }: {
  people: { userId: string; name: string }[]; me: string; value: string; onChange: (id: string) => void
}) {
  if (!people.length) return null
  return (
    <ListGroup>
      <FormRow label="De quem é a compra" htmlFor="qa-owner">
        <SelectField id="qa-owner" value={value || me} onChange={onChange}
          options={people.map(p => ({ value: p.userId, label: p.userId === me ? 'Você' : p.name }))} />
      </FormRow>
    </ListGroup>
  )
}
