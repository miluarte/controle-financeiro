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
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-[4.5rem] items-center justify-around border-t bg-background px-2">
      {NAV_ITEMS.map(({ href, label, icon: Icon, activeIcon: ActiveIcon }) => {
        const active = pathname.startsWith(href)
        const IconComponent = active ? ActiveIcon : Icon
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex min-w-16 flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2.5 text-xs font-medium transition-colors',
              active ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            <IconComponent className="h-6 w-6" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
