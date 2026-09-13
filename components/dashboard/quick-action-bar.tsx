'use client'

import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { AddIcon, TransferHorizontalIcon } from '@solar-icons/react'
import { cn } from '@/lib/utils'

export function QuickActionBar() {
  return (
    <div className="flex gap-2">
      <Link
        href="/transactions/new"
        className={cn(buttonVariants({ variant: 'default' }), 'flex-1')}
      >
        <AddIcon className="mr-2 h-4 w-4" />
        Nova transação
      </Link>
      <Link
        href="/transactions/transfer"
        className={cn(buttonVariants({ variant: 'outline' }), 'flex-1')}
      >
        <TransferHorizontalIcon className="mr-2 h-4 w-4" />
        Transferir
      </Link>
    </div>
  )
}
