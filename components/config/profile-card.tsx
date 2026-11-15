'use client'

import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { COLOR_CLASSES } from '@/components/shared/token-icon'
import { useProfile } from '@/hooks/use-profile'
import { useSession } from '@/hooks/use-session'
import type { ColorToken } from '@/lib/constants'
import { cn } from '@/lib/utils'

// ACE-2: avatar com a inicial, nome e e-mail, no topo dos Ajustes como no iOS.
export function ProfileCard() {
  const { profile } = useProfile()
  const { session } = useSession()
  const name = profile?.name || ''
  const initial = (name || session?.user.email || '?').charAt(0).toUpperCase()

  return (
    <ListGroup>
      <ListRow
        className="py-1"
        leading={
          <span
            className={cn(
              'flex size-14 items-center justify-center rounded-full text-title2 font-semibold',
              COLOR_CLASSES[(profile?.avatarColor as ColorToken) ?? 'gray'] ?? COLOR_CLASSES.gray,
            )}
          >
            {initial}
          </span>
        }
        title={<span className="text-title3 font-semibold">{name || 'Sem nome'}</span>}
        subtitle={session?.user.email}
      />
    </ListGroup>
  )
}
