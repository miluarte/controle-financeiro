'use client'

import Link from 'next/link'
import { BellBoldIcon, BellLinearIcon, EyeClosedLinearIcon, EyeLinearIcon } from '@solar-icons/react'
import { cva } from 'class-variance-authority'
import { MemberAvatar } from '@/components/family/member-avatar'
import { useNotifications } from '@/hooks/use-data'
import { useHideValues } from '@/hooks/use-hide-values'
import { useProfile } from '@/hooks/use-profile'
import { cn } from '@/lib/utils'

// Botão redondo sobre a faixa rosa (ícone branco, fundo branco translúcido).
const brandIconButton = cva(
  'relative inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-fill text-brand-foreground transition-transform outline-none active:scale-95 focus-visible:ring-3 focus-visible:ring-brand-foreground/60 [&_svg]:size-6',
)

// Cabeçalho do Início: faixa rosa que vai até o topo da tela, avatar (abre os Ajustes) à esquerda,
// ocultar valores e notificações à direita, e "Olá, nome" embaixo.
export function HomeHeader() {
  const { profile } = useProfile()
  const { unread } = useNotifications()
  const { hidden, toggle } = useHideValues()
  const firstName = (profile?.name ?? '').trim().split(/\s+/)[0]
  const Bell = unread ? BellBoldIcon : BellLinearIcon

  return (
    <header className="-mt-[env(safe-area-inset-top)] bg-brand px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-6 text-brand-foreground lg:mx-4 lg:mt-0 lg:rounded-3xl lg:pt-5">
      <div className="flex items-center gap-2">
        <Link href="/config" aria-label="Ajustes" className="rounded-full bg-grouped ring-2 ring-brand-foreground/70 transition-transform active:scale-95">
          <MemberAvatar name={profile?.name || '?'} color={profile?.avatarColor ?? 'gray'} size="lg" />
        </Link>
        <div className="flex-1" />
        <button type="button" onClick={toggle} className={brandIconButton()}
          aria-label={hidden ? 'Mostrar valores' : 'Ocultar valores'}>
          {hidden ? <EyeClosedLinearIcon /> : <EyeLinearIcon />}
        </button>
        <Link href="/notifications" className={brandIconButton()}
          aria-label={unread ? `Notificações, ${unread} novas` : 'Notificações'}>
          <Bell />
          {unread > 0 && <span className={cn('absolute top-2 right-2 size-2.5 rounded-full bg-brand-foreground')} />}
        </Link>
      </div>
      <h1 className="mt-6 truncate text-title2 font-semibold">{firstName ? `Olá, ${firstName}` : 'Olá'}</h1>
    </header>
  )
}
