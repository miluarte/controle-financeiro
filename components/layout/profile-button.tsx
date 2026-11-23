'use client'

import Link from 'next/link'
import { MemberAvatar } from '@/components/family/member-avatar'
import { glassButtonVariants } from '@/components/ios/glass-button'
import { useProfile } from '@/hooks/use-profile'
import { cn } from '@/lib/utils'

// Avatar no topo do Início: abre os Ajustes (que saíram da barra de abas).
export function ProfileButton() {
  const { profile } = useProfile()
  return (
    <Link href="/config" aria-label="Ajustes" className={cn(glassButtonVariants(), 'p-1')}>
      <MemberAvatar name={profile?.name || '?'} color={profile?.avatarColor ?? 'gray'} size="md" />
    </Link>
  )
}
