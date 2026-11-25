'use client'

import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// Botão Liquid Glass do iOS 26: círculo ou cápsula de vidro flutuando sobre o conteúdo.
const glassButtonVariants = cva(
  'glass inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full text-foreground transition-transform outline-none select-none active:scale-95 focus-visible:ring-3 focus-visible:ring-ring disabled:opacity-(--alpha-medium) [&_svg]:shrink-0',
  {
    variants: {
      size: {
        icon: 'size-11 [&_svg]:size-6',
        'icon-sm': 'size-9 [&_svg]:size-5',
        capsule: 'h-11 px-4 text-body font-medium',
      },
      tone: {
        default: '',
        // ação principal (confirmar): preenchido com a cor principal
        prominent: 'border-transparent bg-tint text-primary-foreground',
      },
    },
    defaultVariants: { size: 'icon', tone: 'default' },
  },
)

type GlassButtonProps = ButtonPrimitive.Props & VariantProps<typeof glassButtonVariants>

export function GlassButton({ className, size, tone, ...props }: GlassButtonProps) {
  return <ButtonPrimitive className={cn(glassButtonVariants({ size, tone }), className)} {...props} />
}

export { glassButtonVariants }
