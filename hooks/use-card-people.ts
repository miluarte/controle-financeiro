'use client'

import { useMemo } from 'react'
import { useFamily, useFamilyMembers } from '@/hooks/use-family'
import { useProfile } from '@/hooks/use-profile'
import { useSession } from '@/hooks/use-session'
import type { FamilyMember } from '@/lib/types'

// Quem pode ser dono de uma compra no cartão: você e os membros ativos da família.
export function useCardPeople() {
  const { session } = useSession()
  const { profile } = useProfile()
  const { family, status } = useFamily()
  const members = useFamilyMembers(!!family && status === 'active')
  const me = session?.user.id ?? ''
  const people: FamilyMember[] = useMemo(() => {
    const self: FamilyMember = { userId: me, name: profile?.name || 'Você', avatarColor: profile?.avatarColor ?? 'gray', avatarUrl: profile?.avatarUrl ?? null, role: 'member', status: 'active', joinedAt: null }
    return [self, ...members.filter(m => m.status === 'active' && m.userId !== me)]
  }, [members, me, profile?.avatarColor, profile?.avatarUrl, profile?.name])
  const nameOf = (id: string) => (id === me ? 'Você' : people.find(p => p.userId === id)?.name ?? 'Membro')
  return { me, people, nameOf }
}
