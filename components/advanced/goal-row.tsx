import { ProgressBar } from '@/components/shared/progress-bar'
import type { GoalPlan } from '@/lib/advanced'
import { formatCurrency, monthName } from '@/lib/utils'

const monthYear = (m: string) => `${monthName(m, 'short')}/${m.slice(2, 4)}`

// Linha de um objetivo: progresso, quando fica pronto e se cabe na data desejada.
export function GoalRow({ plan, onClick }: { plan: GoalPlan; onClick: () => void }) {
  const { goal, remaining, readyMonth, neededPerMonth, shortfall } = plan
  const progress = goal.savedAmount / goal.targetAmount
  let status = remaining === 0 ? 'Concluído' : readyMonth ? `Pronto em ${monthYear(readyMonth)}` : 'Sem poupança para prever'
  if (neededPerMonth != null) {
    status += shortfall ? ` · faltam ${formatCurrency(shortfall)}/mês` : ` · cabe na data`
  }
  return (
    <li>
      <button type="button" onClick={onClick} className="w-full space-y-2 px-4 py-3 text-left active:bg-fill">
        <div className="flex items-baseline justify-between gap-2">
          <span className="min-w-0 truncate text-body font-medium">{goal.priority}. {goal.name}</span>
          <span className="shrink-0 whitespace-nowrap text-subheadline tabular-nums text-muted-foreground">
            {formatCurrency(goal.savedAmount)} de {formatCurrency(goal.targetAmount)}
          </span>
        </div>
        <ProgressBar value={progress} tone={remaining === 0 ? 'success' : shortfall ? 'warning' : 'default'} />
        <p className="truncate text-footnote text-muted-foreground">{status}</p>
      </button>
    </li>
  )
}
