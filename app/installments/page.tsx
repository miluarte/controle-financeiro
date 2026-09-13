import Link from 'next/link'
import { PageHeader } from '@/components/layout/page-header'
import { InstallmentList } from '@/components/installments/installment-list'
import { buttonVariants } from '@/components/ui/button'
import { AddIcon } from '@solar-icons/react'
import { cn } from '@/lib/utils'

export default function InstallmentsPage() {
  return (
    <>
      <PageHeader
        title="Parcelamentos"
        actions={
          <Link
            href="/transactions/new"
            className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
          >
            <AddIcon className="size-4" />
          </Link>
        }
      />
      <div className="p-4">
        <InstallmentList />
      </div>
    </>
  )
}
