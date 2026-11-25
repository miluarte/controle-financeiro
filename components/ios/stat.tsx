import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// Número de resumo dentro de um <dl>. stacked: rótulo em cima e valor embaixo (grade de 2 ou 3).
// inline: rótulo à esquerda e valor à direita (lista de totais num card). O valor pode ser um <Money as="dd">.
const statVariants = cva('min-w-0', {
  variants: { layout: { stacked: '', inline: 'flex items-baseline justify-between gap-2' } },
  defaultVariants: { layout: 'stacked' },
})
const labelVariants = cva('truncate text-muted-foreground', {
  variants: { layout: { stacked: 'text-footnote', inline: 'text-subheadline' } },
  defaultVariants: { layout: 'stacked' },
})

export function Stat({ label, layout, children, className }: VariantProps<typeof statVariants> & { label: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(statVariants({ layout }), className)}>
      <dt className={labelVariants({ layout })}>{label}</dt>
      {children}
    </div>
  )
}

// Valor de um Stat que não é dinheiro (contagem, porcentagem).
export function StatValue({ children, className }: { children: React.ReactNode; className?: string }) {
  return <dd className={cn('shrink-0 text-headline tabular-nums', className)}>{children}</dd>
}
