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

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className={cn(
        'fixed inset-x-4 z-50 flex items-center justify-around',
        'bottom-[max(1rem,calc(env(safe-area-inset-bottom)+0.5rem))]',
        'rounded-full border border-border/60 bg-background/80 px-2 py-2 shadow-lg backdrop-blur-xl supports-[backdrop-filter]:bg-background/70',
      )}
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon, activeIcon: ActiveIcon }) => {
        const active = pathname.startsWith(href)
        const IconComponent = active ? ActiveIcon : Icon
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex min-w-16 flex-1 flex-col items-center gap-0.5 rounded-full px-2 py-1.5 transition-colors',
              active && 'bg-secondary',
            )}
          >
            <IconComponent className={cn('h-6 w-6', active ? 'text-primary' : 'text-muted-foreground')} />
            <span
              className={cn(
                'text-xs font-medium transition-colors',
                active ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
