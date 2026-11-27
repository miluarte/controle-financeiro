'use client'

import { usePathname, useRouter } from 'next/navigation'
import { AltArrowLeftLinearIcon } from '@solar-icons/react'
import { Button } from '@/components/ui/button'
import { NAV_ITEMS } from '@/components/layout/bottom-nav'
import { cn } from '@/lib/utils'

// Título da página (title1, 28pt; mais discreto que o Large Title do iOS). Voltar, título e ações ficam na mesma linha,
// com os botões centralizados na altura do título.
// Seta de voltar: automática em toda tela que não é uma aba principal (NAV_ITEMS). `back` força mostrar ou esconder.
interface LargeTitleHeaderProps {
  title: React.ReactNode
  eyebrow?: React.ReactNode
  actions?: React.ReactNode
  back?: boolean
  className?: string
}

const isMainTab = (pathname: string) => NAV_ITEMS.some(({ href }) => pathname === href)

export function LargeTitleHeader({ title, eyebrow, actions, back, className }: LargeTitleHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const showBack = back ?? !isMainTab(pathname)
  // aberta direto (link, aviso push, app recém-aberto) não há tela anterior: volta para o Início
  const goBack = () => (window.history.length > 1 ? router.back() : router.push('/home'))
  return (
    <header className={cn('px-4 pt-4 pb-2', className)}>
      {eyebrow && <p className="text-subheadline text-muted-foreground">{eyebrow}</p>}
      <div className="flex items-center gap-1">
        {showBack && (
          <Button variant="plain" size="nav" aria-label="Voltar" onClick={goBack} className="-ml-3 -mr-1 px-0">
            <AltArrowLeftLinearIcon className="size-9 stroke-(length:--icon-stroke-back)" />
          </Button>
        )}
        <h1 className="min-w-0 flex-1 truncate text-title1 font-bold">{title}</h1>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </header>
  )
}
