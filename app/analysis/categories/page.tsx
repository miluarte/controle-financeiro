'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { LargeTitleHeader } from '@/components/ios/large-title-header'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { ReplanSheet } from '@/components/replan/replan-sheet'
import { ProgressBar } from '@/components/shared/progress-bar'
import { TokenIcon } from '@/components/shared/token-icon'
import { useReplanData } from '@/hooks/use-replan-data'
import { UNLOCK_EXPENSES } from '@/lib/replan'
import { formatCurrency } from '@/lib/utils'

const CLASS_LABEL = { essential: 'Essencial', desire: 'Desejo' } as const

// ANA-8: "Suas categorias". As sugestões liberam depois de 30 gastos registrados.
export default function YourCategoriesPage() {
  const { profile: p, loading } = useReplanData()
  const [replanning, setReplanning] = useState(false)
  const unlocked = p.expenseCount >= UNLOCK_EXPENSES
  const subtitle = `${p.months} ${p.months === 1 ? 'mês' : 'meses'} · ${p.expenseCount} ${p.expenseCount === 1 ? 'gasto' : 'gastos'}`

  return (
    <>
      <LargeTitleHeader back title="Suas categorias" />
      <div className="space-y-7 px-4 pt-2">
        <p className="px-4 text-subheadline text-muted-foreground">{loading ? 'Carregando…' : subtitle}</p>

        {!loading && !unlocked && (
          <section className="space-y-3 rounded-3xl bg-grouped p-4">
            <p className="text-headline">Sugestões de ajuste liberam com {UNLOCK_EXPENSES} gastos</p>
            <ProgressBar value={p.expenseCount / UNLOCK_EXPENSES} />
            <p className="text-footnote text-muted-foreground">{p.expenseCount} de {UNLOCK_EXPENSES}. Quanto mais gastos registrados, melhores as sugestões.</p>
          </section>
        )}

        {!loading && unlocked && (
          <ListGroup header="Média por mês" footer={`Base: ${p.baseLabel}.`}>
            {p.rows.map(r => (
              <ListRow key={r.category.id}
                leading={<TokenIcon icon={r.category.icon} color={r.category.color} />}
                title={r.category.name}
                subtitle={[r.category.class ? CLASS_LABEL[r.category.class] : null, r.currentGoal ? `meta ${formatCurrency(r.currentGoal)}` : 'sem meta'].filter(Boolean).join(' · ')}
                trailing={<span className="text-body font-semibold tabular-nums text-foreground">{formatCurrency(r.average)}</span>} />
            ))}
          </ListGroup>
        )}

        <Button size="lg" className="w-full" onClick={() => setReplanning(true)}>Replanejar metas</Button>
      </div>
      <ReplanSheet open={replanning} onOpenChange={setReplanning} />
    </>
  )
}
