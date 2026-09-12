'use client'

import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

export function QuickActionBar() {
  return (
    <div className="flex gap-2">
      <Link
        href="/transactions/new"
        className={cn(buttonVariants({ variant: 'default' }), 'flex-1')}
      >
        <Plus className="mr-2 h-4 w-4" />
        Nova transação
      </Link>
    </div>
  )
}
