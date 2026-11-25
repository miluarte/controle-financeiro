'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// Botão de escolha única em formato de cápsula (categoria, carteira). Selecionado = cor de destaque.
const chipVariants = cva(
  'inline-flex shrink-0 items-center gap-2 rounded-full text-subheadline font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring disabled:opacity-(--alpha-half)',
  {
    variants: {
      selected: {
        true: 'bg-tint text-primary-foreground',
        false: 'bg-fill text-foreground active:opacity-(--alpha-muted)',
      },
      size: {
        default: 'h-9 px-3',
        sm: 'h-8 px-2.5 text-footnote',
      },
    },
    defaultVariants: { selected: false, size: 'default' },
  },
)

interface ChoiceChipProps
  extends Omit<React.ComponentProps<'button'>, 'type'>,
    VariantProps<typeof chipVariants> {}

export function ChoiceChip({ selected, size, className, ...props }: ChoiceChipProps) {
  return (
    <button
      type="button"
      aria-pressed={!!selected}
      className={cn(chipVariants({ selected, size }), className)}
      {...props}
    />
  )
}
