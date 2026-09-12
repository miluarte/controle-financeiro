'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { InstallmentList } from '@/components/installments/installment-list'
import { InstallmentGroupForm } from '@/components/installments/installment-group-form'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Plus } from 'lucide-react'

export default function InstallmentsPage() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <PageHeader
        title="Parcelamentos"
        actions={
          <Button variant="ghost" size="icon-sm" onClick={() => setOpen(true)}>
            <Plus className="size-4" />
          </Button>
        }
      />
      <div className="p-4">
        <InstallmentList />
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Novo parcelamento</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-4">
            <InstallmentGroupForm onSuccess={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
