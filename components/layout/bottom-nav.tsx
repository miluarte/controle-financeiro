'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  WidgetBoldDuotoneIcon,
  WidgetBoldIcon,
  WalletBoldDuotoneIcon,
  WalletBoldIcon,
  CardBoldDuotoneIcon,
  CardBoldIcon,
  TagBoldDuotoneIcon,
  TagBoldIcon,
} from '@solar-icons/react'

type SolarIcon = React.ComponentType<{ className?: string }>

const NAV_ITEMS: { href: string; label: string; icon: SolarIcon; activeIcon: SolarIcon }[] = [
  { href: '/dashboard',    label: 'Início',     icon: WidgetBoldDuotoneIcon, activeIcon: WidgetBoldIcon },
  { href: '/accounts',     label: 'Contas',     icon: WalletBoldDuotoneIcon, activeIcon: WalletBoldIcon },
  { href: '/installments', label: 'Parcelas',   icon: CardBoldDuotoneIcon,   activeIcon: CardBoldIcon },
  { href: '/categories',   label: 'Categorias', icon: TagBoldDuotoneIcon,    activeIcon: TagBoldIcon },
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
