'use client'

import { cn } from '@/lib/utils'

// Controle segmentado do iOS (UISegmentedControl).
interface SegmentedControlProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
  className?: string
  'aria-label'?: string
}

export function SegmentedControl<T extends string>({
  value, onChange, options, className, ...props
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={props['aria-label']}
      className={cn('flex h-9 w-full rounded-full bg-fill p-0.5', className)}
    >
      {options.map(o => {
        const selected = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex-1 rounded-full text-footnote font-semibold transition-all',
              selected ? 'bg-segment text-foreground shadow-control' : 'text-foreground',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
