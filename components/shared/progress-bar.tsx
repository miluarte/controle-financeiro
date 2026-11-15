import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const fillVariants = cva('h-full rounded-full transition-all', {
  variants: {
    tone: {
      default: 'bg-tint',
      success: 'bg-success',
      warning: 'bg-chart-3',
      danger: 'bg-destructive',
    },
  },
  defaultVariants: { tone: 'default' },
})

interface ProgressBarProps extends VariantProps<typeof fillVariants> {
  value: number // 0 a 1 (acima de 1 trava em 100%)
  className?: string
}

export function ProgressBar({ value, tone, className }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-fill', className)} role="progressbar"
      aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className={fillVariants({ tone })} style={{ width: `${pct}%` }} />
    </div>
  )
}

// Tom pelo percentual usado: até 80% normal, até 100% atenção, acima disso estourado.
export function toneFor(ratio: number): 'default' | 'warning' | 'danger' {
  if (ratio > 1) return 'danger'
  if (ratio >= 0.8) return 'warning'
  return 'default'
}
