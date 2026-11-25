import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// Card solto com cantos arredondados (resumos, valores em destaque). raised: branco sobre a página cinza.
// filled: cinza claro, para telas com fundo branco (Screen grouped). floating: branco com sombra (saldo do Início).
const panelVariants = cva('rounded-3xl', {
  variants: {
    tone: { raised: 'bg-grouped', filled: 'bg-fill', floating: 'bg-grouped shadow-floating' },
    padding: { default: 'p-4', large: 'p-5' },
  },
  defaultVariants: { tone: 'raised', padding: 'default' },
})

type PanelTag = 'section' | 'div' | 'dl'

interface PanelProps extends VariantProps<typeof panelVariants> {
  as?: PanelTag
  className?: string
  children: React.ReactNode
}

export function Panel({ as: Tag = 'section', tone, padding, className, children }: PanelProps) {
  return <Tag className={cn(panelVariants({ tone, padding }), className)}>{children}</Tag>
}

export { panelVariants }
