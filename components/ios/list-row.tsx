import { cva, type VariantProps } from 'class-variance-authority'
import { AltArrowRightLinearIcon } from '@solar-icons/react'
import { cn } from '@/lib/utils'
import { SwipeActions, type SwipeExtra } from './swipe-actions'

// Linha de lista do iOS: ícone à esquerda, título e subtítulo, valor à direita, seta opcional.
// O separador começa depois do ícone (recuo), como no iOS.
const rowVariants = cva(
  'relative flex min-h-row w-full items-center gap-3 pl-4 text-left text-body',
  {
    variants: {
      tone: {
        default: 'text-foreground',
        tint: 'justify-center text-tint',
        destructive: 'justify-center text-destructive',
        // aviso (card amarelo): título em âmbar 900; subtítulo e seta em âmbar 600
        warning: 'text-warning-content',
      },
      interactive: {
        true: 'transition-colors active:bg-fill',
        false: '',
      },
    },
    defaultVariants: { tone: 'default', interactive: false },
  },
)

interface ListRowProps extends VariantProps<typeof rowVariants> {
  leading?: React.ReactNode
  title: React.ReactNode
  subtitle?: React.ReactNode
  trailing?: React.ReactNode
  chevron?: boolean
  onClick?: () => void
  // deslizar para a esquerda revela a lixeira
  onDelete?: () => void
  // ação extra no deslizar, ao lado da lixeira
  swipeExtra?: SwipeExtra
  // sem o <li> próprio (quando outro componente já cria o item, ex.: SortableList)
  bare?: boolean
  // inset: separador com recuo (depois do ícone), como no iOS. plain (lista sem card, Início):
  // 16px em cima e embaixo e separador de ponta a ponta
  layout?: 'inset' | 'plain'
  className?: string
}

export function ListRow({
  leading, title, subtitle, trailing, chevron, onClick, onDelete, swipeExtra, bare, tone, layout = 'inset', className,
}: ListRowProps) {
  const centered = tone === 'tint' || tone === 'destructive'
  const plain = layout === 'plain'
  const content = (
    <>
      {leading && <span className={cn('shrink-0', !plain && 'py-2')}>{leading}</span>}
      <span
        className={cn(
          'flex min-w-0 flex-1 items-center gap-2 self-stretch pr-4',
          plain ? 'py-0' : 'border-b border-separator py-2.5 group-last/row:border-b-0',
          centered && 'justify-center',
        )}
      >
        <span className={cn('min-w-0', !centered && 'flex-1')}>
          {/* no máximo duas linhas (título e subtítulo), cada uma corta com reticências numa linha só */}
          <span className="block truncate">{title}</span>
          {subtitle && <span className={cn('block truncate whitespace-nowrap text-subheadline [&>*]:whitespace-nowrap', tone === 'warning' ? 'text-warning-content-secondary' : 'text-muted-foreground')}>{subtitle}</span>}
        </span>
        {trailing && <span className="shrink-0 text-muted-foreground">{trailing}</span>}
        {chevron && <AltArrowRightLinearIcon className={cn('size-4 shrink-0', tone === 'warning' ? 'text-warning-content-secondary' : 'text-muted-foreground')} />}
      </span>
    </>
  )

  const row = onClick ? (
    <button type="button" onClick={onClick} className={cn(rowVariants({ tone, interactive: true }), plain && 'py-4', className)}>
      {content}
    </button>
  ) : (
    <div className={cn(rowVariants({ tone, interactive: false }), plain && 'py-4', className)}>{content}</div>
  )

  const body = onDelete ? <SwipeActions onDelete={onDelete} extra={swipeExtra}>{row}</SwipeActions> : row
  return bare ? body : <li className={cn('group/row', plain && 'border-b border-separator last:border-b-0')}>{body}</li>
}
