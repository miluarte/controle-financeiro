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
        'fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around',
        'border-t border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70',
        'px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]',
      )}
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon, activeIcon: ActiveIcon }) => {
        const active = pathname.startsWith(href)
        const IconComponent = active ? ActiveIcon : Icon
        return (
          <Link key={href} href={href} className="flex min-w-16 flex-1 flex-col items-center gap-1">
            <span
              className={cn(
                'flex items-center justify-center rounded-full px-4 py-1 transition-colors',
                active && 'bg-secondary',
              )}
            >
              <IconComponent className={cn('h-6 w-6', active ? 'text-primary' : 'text-muted-foreground')} />
            </span>
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
