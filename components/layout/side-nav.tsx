'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AppLogo } from '@/components/shared/app-logo'
import { cn } from '@/lib/utils'
import { AddMenu } from './add-menu'
import { NAV_ITEMS, isNavActive } from './bottom-nav'

// Desktop (lg): menu lateral com a logo, as mesmas abas da barra do celular e o botão Adicionar.
export function SideNav() {
  const pathname = usePathname()
  return (
    <aside className="hidden w-64 shrink-0 flex-col gap-6 border-r border-separator bg-grouped px-4 py-6 lg:flex">
      <div className="flex items-center gap-3 px-2">
        <AppLogo size="sm" />
        <span className="text-title3 font-bold">Troco</span>
      </div>
      <AddMenu variant="sidebar" />
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon, activeIcon: ActiveIcon, also }) => {
          const active = isNavActive(pathname, href, also)
          const IconComponent = active ? ActiveIcon : Icon
          return (
            <Link key={href} href={href} aria-current={active ? 'page' : undefined}
              className={cn(
                'flex h-row items-center gap-3 rounded-full px-4 text-body transition-colors',
                active ? 'bg-fill font-semibold text-tint' : 'text-foreground/80 hover:bg-fill',
              )}>
              <IconComponent className="size-5" />{label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
