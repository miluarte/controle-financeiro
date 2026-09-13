'use client'

import { useRouter } from 'next/navigation'
import { AltArrowLeftBoldDuotoneIcon } from '@solar-icons/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  back?: boolean
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ title, back, actions, className }: PageHeaderProps) {
  const router = useRouter()

  return (
    <header className={cn('flex h-16 items-center gap-2 border-b bg-background px-4', className)}>
      {back && (
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="-ml-2.5">
          <AltArrowLeftBoldDuotoneIcon className="h-6 w-6" />
        </Button>
      )}
      <h1 className="flex-1 text-lg font-semibold">{title}</h1>
      {actions}
    </header>
  )
}
