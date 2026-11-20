'use client'

import { useRouter } from 'next/navigation'
import { AltArrowLeftLinearIcon } from '@solar-icons/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Título da página (title1, 28pt; mais discreto que o Large Title do iOS). Voltar, título e ações ficam na mesma linha,
// com os botões centralizados na altura do título.
interface LargeTitleHeaderProps {
  title: React.ReactNode
  eyebrow?: React.ReactNode
  actions?: React.ReactNode
  back?: boolean
  className?: string
}

export function LargeTitleHeader({ title, eyebrow, actions, back, className }: LargeTitleHeaderProps) {
  const router = useRouter()
  return (
    <header className={cn('px-4 pt-4 pb-2', className)}>
      {eyebrow && <p className="text-subheadline text-muted-foreground">{eyebrow}</p>}
      <div className="flex items-center gap-1">
        {back && (
          <Button variant="plain" size="nav" aria-label="Voltar" onClick={() => router.back()} className="-ml-3 -mr-1 px-0">
            <AltArrowLeftLinearIcon className="size-9" />
          </Button>
        )}
        <h1 className="min-w-0 flex-1 truncate text-title1 font-bold">{title}</h1>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </header>
  )
}
