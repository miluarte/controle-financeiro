import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const dotsVariants = cva('loading-dots inline-flex items-center', {
  variants: {
    size: {
      sm: 'gap-1 [&>span]:size-1.5',
      md: 'gap-1.5 [&>span]:size-2',
      lg: 'gap-2 [&>span]:size-2.5',
    },
    tone: {
      muted: 'text-muted-foreground',
      current: '',
    },
  },
  defaultVariants: { size: 'md', tone: 'muted' },
})

interface LoadingDotsProps extends VariantProps<typeof dotsVariants> {
  label?: string
  className?: string
}

// Três pontos pulsando (animação loading-dots em app/globals.css). Com label, o texto é lido pelo leitor de tela.
export function LoadingDots({ size, tone, label = 'Carregando', className }: LoadingDotsProps) {
  return (
    <span role="status" aria-label={label} className={cn(dotsVariants({ size, tone }), className)}>
      <span className="rounded-full bg-current" />
      <span className="rounded-full bg-current" />
      <span className="rounded-full bg-current" />
    </span>
  )
}

// Bloco de carregamento de uma seção ou tela: pontos centralizados.
export function LoadingBlock({ fullScreen, className }: { fullScreen?: boolean; className?: string }) {
  return (
    <div className={cn('flex items-center justify-center py-10', fullScreen && 'min-h-dvh py-0', className)}>
      <LoadingDots size="lg" />
    </div>
  )
}
