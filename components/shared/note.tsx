import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// Texto de apoio solto (fora de uma lista): explicação curta numa folha, aviso de estado.
const noteVariants = cva('text-muted-foreground', {
  variants: {
    size: { footnote: 'px-4 text-footnote', subheadline: 'text-subheadline' },
    align: { start: '', center: 'text-center' },
  },
  defaultVariants: { size: 'footnote', align: 'center' },
})

export function Note({ size, align, className, children }: VariantProps<typeof noteVariants> & { className?: string; children: React.ReactNode }) {
  return <p className={cn(noteVariants({ size, align }), className)}>{children}</p>
}
