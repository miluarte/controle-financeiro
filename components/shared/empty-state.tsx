import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// Lista vazia. row: uma linha dentro de um ListGroup (<li>). block: bloco solto com título e texto.
const emptyVariants = cva('text-center', {
  variants: {
    variant: { row: 'p-4 text-subheadline text-muted-foreground', block: 'px-4 py-10' },
  },
  defaultVariants: { variant: 'row' },
})

interface EmptyStateProps extends VariantProps<typeof emptyVariants> {
  title?: string
  children?: React.ReactNode
  className?: string
}

export function EmptyState({ variant, title, children, className }: EmptyStateProps) {
  if (variant === 'block') {
    return (
      <div className={cn(emptyVariants({ variant }), className)}>
        {title && <p className="text-headline">{title}</p>}
        {children && <p className="text-subheadline text-muted-foreground">{children}</p>}
      </div>
    )
  }
  return <li className={cn(emptyVariants({ variant }), className)}>{children ?? title}</li>
}
