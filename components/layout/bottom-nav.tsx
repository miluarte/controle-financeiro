'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Home2BoldDuotoneIcon,
  Home2BoldIcon,
  SettingsBoldDuotoneIcon,
  SettingsBoldIcon,
} from '@solar-icons/react'

type SolarIcon = React.ComponentType<{ className?: string }>

// NAV-1 prevê Contas, Home, Análise e Config. Contas e Análise entram quando as telas existirem.
const NAV_ITEMS: { href: string; label: string; icon: SolarIcon; activeIcon: SolarIcon }[] = [
  { href: '/home',   label: 'Home',   icon: Home2BoldDuotoneIcon,    activeIcon: Home2BoldIcon },
  { href: '/config', label: 'Config', icon: SettingsBoldDuotoneIcon, activeIcon: SettingsBoldIcon },
]

// Barra de abas do iOS: largura total, fundo translúcido com desfoque, hairline no topo,
// ícone + rótulo pequeno, aba ativa na cor de destaque e ícone preenchido.
export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-separator bg-bar pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      <div className="flex h-tabbar items-stretch">
        {NAV_ITEMS.map(({ href, label, icon: Icon, activeIcon: ActiveIcon }) => {
          const active = pathname.startsWith(href)
          const IconComponent = active ? ActiveIcon : Icon
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 pt-1',
                active ? 'text-tint' : 'text-muted-foreground',
              )}
            >
              <IconComponent className="size-7" />
              <span className="text-caption2 font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
