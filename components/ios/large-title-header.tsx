'use client'

import { useRouter } from 'next/navigation'
import { AltArrowLeftBoldDuotoneIcon } from '@solar-icons/react'
import { GlassButton } from './glass-button'
import { cn } from '@/lib/utils'

// Título grande do iOS (Large Title). Botão de voltar de vidro à esquerda e ações à direita.
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
    <header className={cn('px-4 pt-2 pb-2', className)}>
      <div className="flex h-11 items-center gap-2">
        {back && (
          <GlassButton aria-label="Voltar" onClick={() => router.back()}>
            <AltArrowLeftBoldDuotoneIcon />
          </GlassButton>
        )}
        <div className="ml-auto flex items-center gap-2">{actions}</div>
      </div>
      {eyebrow && <p className="text-subheadline text-muted-foreground">{eyebrow}</p>}
      <h1 className="truncate text-large-title font-bold">{title}</h1>
    </header>
  )
}
