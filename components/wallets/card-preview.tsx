import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// CAR-3: prévia do cartão com o acabamento escolhido.
const cardVariants = cva(
  'relative flex aspect-[1.586] w-full flex-col justify-between overflow-hidden rounded-2xl p-4 shadow-lg',
  {
    variants: {
      finish: {
        black: 'bg-gradient-to-br from-neutral-800 to-black text-white',
        graphite: 'bg-gradient-to-br from-neutral-600 to-neutral-800 text-white',
        gray: 'bg-gradient-to-br from-neutral-400 to-neutral-500 text-white',
        silver: 'bg-gradient-to-br from-neutral-100 to-neutral-300 text-neutral-900',
        white: 'bg-gradient-to-br from-white to-neutral-100 text-neutral-900 ring-1 ring-black/5',
        purple: 'bg-gradient-to-br from-purple-500 to-purple-800 text-white',
        blue: 'bg-gradient-to-br from-blue-500 to-blue-800 text-white',
        green: 'bg-gradient-to-br from-emerald-500 to-emerald-800 text-white',
        red: 'bg-gradient-to-br from-red-500 to-red-800 text-white',
        gold: 'bg-gradient-to-br from-amber-300 to-amber-600 text-neutral-900',
      },
      size: {
        default: 'max-w-80',
        sm: 'w-14 rounded-md p-1 shadow-sm',
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
      <span className="text-footnote font-semibold uppercase opacity-80">{typeLabel}</span>
      <div>
        <p className="truncate text-title3 font-semibold">{name || 'Nome da carteira'}</p>
        {subtitle && <p className="text-footnote opacity-80">{subtitle}</p>}
      </div>
    </div>
  )
}

const FINISH_KEYS = {
  black: 1, graphite: 1, gray: 1, silver: 1, white: 1, purple: 1, blue: 1, green: 1, red: 1, gold: 1,
}
