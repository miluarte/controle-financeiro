'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { AddMenu } from './add-menu'
import {
  BillListLinearIcon,
  BillListBoldIcon,
  ChartSquareLinearIcon,
  ChartSquareBoldIcon,
  Home2LinearIcon,
  Home2BoldIcon,
  SettingsLinearIcon,
  SettingsBoldIcon,
} from '@solar-icons/react'

type SolarIcon = React.ComponentType<{ className?: string }>

// NAV-1: Contas, Início, Análise e Ajustes. Transações abre por "Ver todas" no Início.
export const NAV_ITEMS: { href: string; label: string; icon: SolarIcon; activeIcon: SolarIcon; also?: string[] }[] = [
  { href: '/bills',    label: 'Contas',  icon: BillListLinearIcon,    activeIcon: BillListBoldIcon },
  { href: '/home',     label: 'Início',  icon: Home2LinearIcon,       activeIcon: Home2BoldIcon, also: ['/transactions'] },
  { href: '/analysis', label: 'Análise', icon: ChartSquareLinearIcon, activeIcon: ChartSquareBoldIcon },
  { href: '/config',   label: 'Ajustes', icon: SettingsLinearIcon,    activeIcon: SettingsBoldIcon },
]

// Barra de abas Liquid Glass (iOS 26): cápsula de vidro flutuante, aba ativa marcada por uma
// "lente" de vidro mais densa, ícone preenchido e na cor principal. Ao lado, o botão + (AddMenu).
// Fica presa ao fundo do AppShell (que ocupa a tela toda), sem position fixed. No desktop dá lugar ao SideNav.
export const isNavActive = (pathname: string, href: string, also?: string[]) =>
  [href, ...(also ?? [])].some(p => pathname.startsWith(p))

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="pointer-events-none absolute lg:hidden inset-x-0 bottom-0 z-40 flex justify-center gap-3 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="glass pointer-events-auto flex h-tabbar max-w-sm flex-1 items-stretch gap-1 rounded-full p-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon, activeIcon: ActiveIcon, also }) => {
          const active = isNavActive(pathname, href, also)
          const IconComponent = active ? ActiveIcon : Icon
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full transition-colors active:scale-95',
                active ? 'bg-glass-lens text-tint' : 'text-foreground/70',
              )}
            >
              <IconComponent className="size-6" />
              <span className="text-caption2 font-semibold">{label}</span>
            </Link>
          )
        })}
      </div>
      <div className="pointer-events-auto"><AddMenu /></div>
    </nav>
  )
}
