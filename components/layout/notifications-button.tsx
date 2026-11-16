'use client'

import Link from 'next/link'
import { BellBoldIcon, BellLinearIcon } from '@solar-icons/react'
import { glassButtonVariants } from '@/components/ios/glass-button'
import { useNotifications } from '@/hooks/use-data'
import { cn } from '@/lib/utils'

// Sino da central de notificações, com um ponto quando há aviso não lido.
export function NotificationsButton() {
  const { unread } = useNotifications()
  const Icon = unread ? BellBoldIcon : BellLinearIcon
  return (
    <Link href="/notifications" aria-label={unread ? `Notificações, ${unread} novas` : 'Notificações'}
      className={cn(glassButtonVariants(), 'relative')}>
      <Icon />
      {unread > 0 && <span className="absolute top-2 right-2 size-2.5 rounded-full bg-destructive" />}
    </Link>
  )
}
