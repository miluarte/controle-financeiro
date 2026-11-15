'use client'

import { Card, CardContent } from '@/components/ui/card'
import { TokenIcon } from '@/components/shared/token-icon'
import { useProfile } from '@/hooks/use-profile'
import { useSession } from '@/hooks/use-session'
import { COLOR_CLASSES } from '@/components/shared/token-icon'
import type { ColorToken } from '@/lib/constants'
import { cn } from '@/lib/utils'

// ACE-2: avatar com a inicial, nome e e-mail.
export function ProfileCard() {
  const { profile } = useProfile()
  const { session } = useSession()
  const name = profile?.name || ''
  const initial = (name || session?.user.email || '?').charAt(0).toUpperCase()

  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        {name ? (
          <div
            className={cn(
              'flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-semibold',
              COLOR_CLASSES[(profile?.avatarColor as ColorToken) ?? 'gray'] ?? COLOR_CLASSES.gray,
            )}
          >
            {initial}
          </div>
        ) : (
          <TokenIcon icon="ellipsis" color="gray" size="lg" />
        )}
        <div className="min-w-0">
          <p className="truncate font-semibold">{name || 'Sem nome'}</p>
          <p className="truncate text-sm text-muted-foreground">{session?.user.email}</p>
        </div>
      </CardContent>
    </Card>
  )
}
