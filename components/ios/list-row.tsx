import { cva, type VariantProps } from 'class-variance-authority'
import { AltArrowRightBoldDuotoneIcon } from '@solar-icons/react'
import { cn } from '@/lib/utils'

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
  className?: string
}

export function ListRow({
  leading, title, subtitle, trailing, chevron, onClick, tone, className,
}: ListRowProps) {
  const centered = tone === 'tint' || tone === 'destructive'
  const content = (
    <>
      {leading && <span className="shrink-0 py-2">{leading}</span>}
      <span
        className={cn(
          'flex min-w-0 flex-1 items-center gap-2 self-stretch py-2.5 pr-4',
          'border-b border-separator group-last/row:border-b-0',
          centered && 'justify-center',
        )}
      >
        <span className={cn('min-w-0', !centered && 'flex-1')}>
          <span className="block truncate">{title}</span>
          {subtitle && <span className="block truncate text-subheadline text-muted-foreground">{subtitle}</span>}
        </span>
        {trailing && <span className="shrink-0 text-muted-foreground">{trailing}</span>}
        {chevron && <AltArrowRightBoldDuotoneIcon className="size-4 shrink-0 text-muted-foreground" />}
      </span>
    </>
  )

  return (
    <li className="group/row">
      {onClick ? (
        <button type="button" onClick={onClick} className={cn(rowVariants({ tone, interactive: true }), className)}>
          {content}
        </button>
      ) : (
        <div className={cn(rowVariants({ tone, interactive: false }), className)}>{content}</div>
      )}
    </li>
  )
}
