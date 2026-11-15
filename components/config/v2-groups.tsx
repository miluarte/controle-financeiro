'use client'

import { useRouter } from 'next/navigation'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { useFamily, useFamilyMembers } from '@/hooks/use-family'

// Config > Família (5.15, item 4).
export function FamilyGroup() {
  const router = useRouter()
  const { family, status } = useFamily()
  const members = useFamilyMembers(!!family && status === 'active')
  const trailing = !family ? 'Criar ou entrar' : status === 'pending' ? 'Aguardando' : `${members.filter(m => m.status === 'active').length} membros`
  return (
    <ListGroup header="Família" footer="Compartilhe cartões com quem mora com você. Cada um continua vendo só as próprias finanças.">
      <ListRow title={family?.name ?? 'Família'} trailing={trailing} chevron onClick={() => router.push('/config/family')} />
    </ListGroup>
  )
}

// Config > Notificações (5.15, item 6).
export function NotificationsGroup() {
  const router = useRouter()
  return (
    <ListGroup header="Notificações">
      <ListRow title="Notificações" trailing="Ajustar" chevron onClick={() => router.push('/config/notifications')} />
    </ListGroup>
  )
}
