'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// Botão de escolha única (categoria, carteira, tipo). Selecionado = preenchido.
const chipVariants = cva(
  'inline-flex shrink-0 items-center gap-2 rounded-full border text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50',
  {
    variants: {
      selected: {
        true: 'border-primary bg-primary text-primary-foreground',
        false: 'border-border bg-background text-foreground',
      },
      size: {
        default: 'h-9 px-3',
        sm: 'h-8 px-2.5 text-xs',
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
