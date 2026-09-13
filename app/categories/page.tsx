'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { CategoryBadge } from '@/components/categories/category-badge'
import { CategoryForm } from '@/components/categories/category-form'
import { BudgetGoalItem } from '@/components/budget/budget-goal-item'
import { BudgetGoalForm } from '@/components/budget/budget-goal-form'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { AddIcon } from '@solar-icons/react'

export default function CategoriesPage() {
  const [categorySheetOpen, setCategorySheetOpen] = useState(false)
  const [goalSheetOpen, setGoalSheetOpen] = useState(false)

  return (
    <>
      <PageHeader title="Categorias & Metas" />
      <div className="space-y-6 p-4">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Categorias
            </h2>
            <Button variant="ghost" size="icon-sm" onClick={() => setCategorySheetOpen(true)}>
              <AddIcon className="size-4" />
            </Button>
          </div>
          <CategoryBadge />
        </section>
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Metas de orçamento
            </h2>
            <Button variant="ghost" size="icon-sm" onClick={() => setGoalSheetOpen(true)}>
              <AddIcon className="size-4" />
            </Button>
          </div>
          <BudgetGoalItem />
        </section>
      </div>

      <Sheet open={categorySheetOpen} onOpenChange={setCategorySheetOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Nova categoria</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-4">
            <CategoryForm onSuccess={() => setCategorySheetOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={goalSheetOpen} onOpenChange={setGoalSheetOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Nova meta de orçamento</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-4">
            <BudgetGoalForm onSuccess={() => setGoalSheetOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
