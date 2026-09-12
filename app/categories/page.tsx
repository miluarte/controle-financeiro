import { PageHeader } from '@/components/layout/page-header'
import { CategoryBadge } from '@/components/categories/category-badge'
import { BudgetGoalItem } from '@/components/budget/budget-goal-item'

export default function CategoriesPage() {
  return (
    <>
      <PageHeader title="Categorias & Metas" />
      <div className="p-4 space-y-6">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Categorias
          </h2>
          <CategoryBadge />
        </section>
        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Metas de orçamento
          </h2>
          <BudgetGoalItem />
        </section>
      </div>
    </>
  )
}
