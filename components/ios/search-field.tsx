'use client'

import { MagnifierLinearIcon } from '@solar-icons/react'
import { cn } from '@/lib/utils'

// Campo de busca do iOS.
export function SearchField({ className, ...props }: Omit<React.ComponentProps<'input'>, 'type'>) {
  return (
    <label className={cn('flex h-10 items-center gap-2 rounded-xl bg-fill px-3', className)}>
      <MagnifierLinearIcon className="size-5 shrink-0 text-muted-foreground" />
      <input type="search" className="h-full min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-muted-foreground" {...props} />
    </label>
  )
}
