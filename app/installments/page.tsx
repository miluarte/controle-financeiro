import Link from 'next/link'
import { PageHeader } from '@/components/layout/page-header'
import { InstallmentView } from '@/components/installments/installment-view'
import { buttonVariants } from '@/components/ui/button'
import { AddBoldDuotoneIcon } from '@solar-icons/react'
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
            <AddBoldDuotoneIcon className="size-4" />
          </Link>
        }
      />
      <div className="p-4">
        <InstallmentView />
      </div>
    </>
  )
}
