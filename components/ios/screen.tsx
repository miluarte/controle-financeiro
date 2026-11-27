import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// Fundo da tela. page: cinza da página (padrão do app, listas em card). grouped: no tom dos cards,
// cobrindo a tela toda (Início e Transações, com a lista de lançamentos direto no fundo).
const screenVariants = cva('', {
  variants: {
    variant: {
      page: '',
      grouped: '-mb-shell-bottom min-h-app bg-grouped pb-shell-bottom lg:mb-0 lg:min-h-0 lg:rounded-3xl lg:pb-6',
    },
  },
  defaultVariants: { variant: 'page' },
})

export function Screen({ variant, className, children }: VariantProps<typeof screenVariants> & { className?: string; children: React.ReactNode }) {
  return <div data-screen={variant ?? 'page'} className={cn(screenVariants({ variant }), className)}>{children}</div>
}
