import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// CAR-3: prévia do cartão com o acabamento escolhido.
const cardVariants = cva(
  'relative flex aspect-card w-full flex-col justify-between overflow-hidden rounded-2xl p-4 shadow-floating',
  {
    variants: {
      finish: {
        black: 'bg-gradient-to-br from-finish-black-start to-finish-black-end text-finish-on-dark',
        graphite: 'bg-gradient-to-br from-finish-graphite-start to-finish-graphite-end text-finish-on-dark',
        gray: 'bg-gradient-to-br from-finish-gray-start to-finish-gray-end text-finish-on-dark',
        silver: 'bg-gradient-to-br from-finish-silver-start to-finish-silver-end text-finish-on-light',
        white: 'bg-gradient-to-br from-finish-white-start to-finish-white-end text-finish-on-light ring-1 ring-finish-edge',
        purple: 'bg-gradient-to-br from-finish-purple-start to-finish-purple-end text-finish-on-dark',
        blue: 'bg-gradient-to-br from-finish-blue-start to-finish-blue-end text-finish-on-dark',
        green: 'bg-gradient-to-br from-finish-green-start to-finish-green-end text-finish-on-dark',
        red: 'bg-gradient-to-br from-finish-red-start to-finish-red-end text-finish-on-dark',
        gold: 'bg-gradient-to-br from-finish-gold-start to-finish-gold-end text-finish-on-light',
      },
      size: {
        default: 'max-w-80',
        sm: 'w-14 rounded-md p-1 shadow-raised',
      },
    },
    defaultVariants: { finish: 'black', size: 'default' },
  },
)

type Finish = NonNullable<Parameters<typeof cardVariants>[0]>['finish']

interface CardPreviewProps {
  name: string
  finish: string
  typeLabel?: string
  subtitle?: string
  size?: 'default' | 'sm'
  className?: string
}

export function CardPreview({ name, finish, typeLabel, subtitle, size, className }: CardPreviewProps) {
  const f = (finish in FINISH_KEYS ? finish : 'black') as Finish
  if (size === 'sm') return <div className={cn(cardVariants({ finish: f, size }), className)} aria-hidden />
  return (
    <div className={cn(cardVariants({ finish: f, size }), className)}>
      <span className="text-footnote font-semibold uppercase opacity-(--alpha-strong)">{typeLabel}</span>
      <div>
        <p className="truncate text-title3 font-semibold">{name || 'Nome da carteira'}</p>
        {subtitle && <p className="text-footnote opacity-(--alpha-strong)">{subtitle}</p>}
      </div>
    </div>
  )
}

const FINISH_KEYS = {
  black: 1, graphite: 1, gray: 1, silver: 1, white: 1, purple: 1, blue: 1, green: 1, red: 1, gold: 1,
}
