'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { AddMenu } from './add-menu'
import {
  BillListLinearIcon,
  BillListBoldIcon,
  CardLinearIcon,
  CardBoldIcon,
  Home2LinearIcon,
  Home2BoldIcon,
  SettingsLinearIcon,
  SettingsBoldIcon,
} from '@solar-icons/react'

type SolarIcon = React.ComponentType<{ className?: string }>

type NavItem = { href: string; label: string; icon: SolarIcon; activeIcon: SolarIcon; also?: string[] }

// Início, Contas (só fixas) e Cartões (faturas). Transações abre por "Ver todas" e Análise pelo card "Análise de {mês}", ambos no Início.
// Ajustes abre pelo avatar no Início (no desktop, também no fim do menu lateral).
export const NAV_ITEMS: NavItem[] = [
  { href: '/home',     label: 'Início',  icon: Home2LinearIcon,       activeIcon: Home2BoldIcon, also: ['/transactions', '/analysis'] },
  { href: '/bills',    label: 'Contas',  icon: BillListLinearIcon,    activeIcon: BillListBoldIcon },
  { href: '/cards',    label: 'Cartões', icon: CardLinearIcon,        activeIcon: CardBoldIcon },
]

export const SETTINGS_ITEM: NavItem = { href: '/config', label: 'Ajustes', icon: SettingsLinearIcon, activeIcon: SettingsBoldIcon }

// Barra de abas (iOS 26): cápsula flutuante de fundo sólido, sem desfoque (a lista por trás não fica borrada), só ícones (o nome fica no aria-label),
// aba ativa marcada por uma "lente" rosa, ícone preenchido e na cor principal (rosa). Ao lado, o botão + (AddMenu).
// Fica presa ao fundo do AppShell (que ocupa a tela toda), sem position fixed. No desktop dá lugar ao SideNav.
export const isNavActive = (pathname: string, href: string, also?: string[]) =>
  [href, ...(also ?? [])].some(p => pathname.startsWith(p))

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="pointer-events-none absolute lg:hidden inset-x-0 bottom-0 z-40 flex justify-center gap-3 px-4 pb-safe-bar">
      <div className="bar-solid pointer-events-auto flex h-tabbar max-w-sm flex-1 items-stretch gap-1 rounded-full p-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon, activeIcon: ActiveIcon, also }) => {
          const active = isNavActive(pathname, href, also)
          const IconComponent = active ? ActiveIcon : Icon
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              aria-label={label}
              className={cn(
                'flex flex-1 items-center justify-center rounded-full transition-colors active:scale-95',
                active ? 'bg-glass-lens text-tint' : 'text-foreground/(--alpha-muted)',
              )}
            >
              <IconComponent className="size-7" />
            </Link>
          )
        })}
      </div>
      <div className="pointer-events-auto"><AddMenu /></div>
    </nav>
  )
}
