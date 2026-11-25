'use client'

import Link from 'next/link'
import { MagnifierLinearIcon } from '@solar-icons/react'
import { heroButtonVariants } from './hero-button'
import { MemberAvatar } from '@/components/family/member-avatar'
import { NotificationsButton } from '@/components/layout/notifications-button'
import { useProfile } from '@/hooks/use-profile'
import { greeting } from '@/lib/utils'

// Topo do Início: faixa colorida (a barra de status fica na cor do fundo da tela, como nas outras telas) com avatar (abre os Ajustes),
// saudação e nome, busca e notificações. O conteúdo (card de saldo) sobe por cima do fim da faixa.
export function HomeHero({ children }: { children: React.ReactNode }) {
  const { profile } = useProfile()
  const name = profile?.name || ' '
  return (
    <div className="relative">
      <div className="absolute inset-x-0 -top-safe-top bottom-28 bg-hero lg:top-0 lg:rounded-3xl" aria-hidden />
      <div className="relative space-y-6 px-4 pt-4">
        <header className="flex items-center gap-3">
          <Link href="/config" aria-label="Ajustes" className="shrink-0 rounded-full active:scale-95">
            <MemberAvatar name={name.trim() || '?'} color="gray" size="lg" className="bg-on-hero text-hero" />
          </Link>
          <div className="min-w-0 flex-1 text-on-hero">
            <p className="truncate text-subheadline">{greeting()},</p>
            <h1 className="truncate text-title2 font-bold">{name}</h1>
          </div>
          <Link href="/transactions?busca=1" aria-label="Buscar" className={heroButtonVariants()}>
            <MagnifierLinearIcon />
          </Link>
          <NotificationsButton tone="hero" />
        </header>
        {children}
      </div>
    </div>
  )
}
