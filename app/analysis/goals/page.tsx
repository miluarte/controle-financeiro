'use client'

import { useState } from 'react'
import { AddLinearIcon } from '@solar-icons/react'
import { GoalRow } from '@/components/advanced/goal-row'
import { GoalSheet } from '@/components/advanced/goal-sheet'
import { GlassButton } from '@/components/ios/glass-button'
import { LargeTitleHeader } from '@/components/ios/large-title-header'
import { ListGroup } from '@/components/ios/list-group'
import { useGoals, useHistory } from '@/hooks/use-data'
import { averageSavings, planGoals } from '@/lib/advanced'
import type { Goal } from '@/lib/types'
import { LoadingBlock } from '@/components/shared/loading-dots'
import { Panel } from '@/components/ios/panel'
import { Money } from '@/components/shared/money'

// Objetivos com simulação: quando cada um fica pronto com a poupança média real.
export default function GoalsPage() {
  const { goals, loading } = useGoals()
  const { history } = useHistory(12)
  const { average, months } = averageSavings(history)
  const plans = planGoals(goals, average)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [open, setOpen] = useState(false)

  function openGoal(goal: Goal | null) { setEditing(goal); setOpen(true) }

  return (
    <>
      <LargeTitleHeader title="Objetivos"
        actions={<GlassButton aria-label="Novo objetivo" onClick={() => openGoal(null)}><AddLinearIcon /></GlassButton>} />
      <div className="space-y-7 px-4 pt-2">
        <Panel>
          <p className="text-subheadline text-muted-foreground">Você guarda em média</p>
          <Money as="p" size="title" cents={average} suffix="/mês" />
          <p className="text-footnote text-muted-foreground">
            {months ? `Últimos ${months} ${months === 1 ? 'mês' : 'meses'} completos` : 'Sem meses completos ainda'}
          </p>
        </Panel>

        {loading ? (
          <LoadingBlock />
        ) : plans.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-headline">Nenhum objetivo</p>
            <p className="text-subheadline text-muted-foreground">Toque no + para criar</p>
          </div>
        ) : (
          <ListGroup header="Em ordem de prioridade">
            {plans.map(p => <GoalRow key={p.goal.id} plan={p} onClick={() => openGoal(p.goal)} />)}
          </ListGroup>
        )}
      </div>
      <GoalSheet open={open} goal={editing} nextPriority={goals.length + 1} onOpenChange={setOpen} />
    </>
  )
}
