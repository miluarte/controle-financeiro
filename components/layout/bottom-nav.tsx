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

// Barra de abas Liquid Glass (iOS 26): cápsula de vidro flutuante, aba ativa marcada por uma
// "lente" de vidro mais densa, ícone preenchido e na cor principal.
export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="glass flex h-tabbar w-full max-w-sm items-stretch gap-1 rounded-full p-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon, activeIcon: ActiveIcon }) => {
          const active = pathname.startsWith(href)
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
    </nav>
  )
}
