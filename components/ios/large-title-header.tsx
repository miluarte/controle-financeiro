import { cn } from '@/lib/utils'

// Título grande do iOS (Large Title), com ações à direita na altura da barra de navegação.
interface LargeTitleHeaderProps {
  title: React.ReactNode
  eyebrow?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export function LargeTitleHeader({ title, eyebrow, actions, className }: LargeTitleHeaderProps) {
  return (
    <header className={cn('px-4 pt-2 pb-2', className)}>
      <div className="flex h-11 items-center justify-end gap-1">{actions}</div>
      {eyebrow && <p className="text-subheadline text-muted-foreground">{eyebrow}</p>}
      <h1 className="truncate text-large-title font-bold">{title}</h1>
    </header>
  )
}
