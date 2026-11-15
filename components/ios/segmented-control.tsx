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
      className={cn('flex h-8 w-full rounded-lg bg-fill p-0.5', className)}
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
              'flex-1 rounded-md text-footnote font-medium transition-all',
              selected ? 'bg-segment text-foreground shadow-sm' : 'text-foreground',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
