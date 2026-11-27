'use client'

import Link from 'next/link'
import { PieChart2LinearIcon } from '@solar-icons/react'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { Money } from '@/components/shared/money'
import { HIDDEN_MONEY, useHideValues } from '@/hooks/use-hide-values'
import { useMonthSummary } from '@/hooks/use-month-summary'
import { monthName } from '@/lib/utils'

// Atalho do Início para a Análise: "Análise de novembro" e quanto já foi gasto no mês.
// Respeita o olho do card de saldo (valor oculto enquanto os valores estiverem ocultos).
export function MonthAnalysisLink({ month }: { month: string }) {
  const { summary } = useMonthSummary(month)
  const { hidden } = useHideValues()

  return (
    <ListGroup variant="filled">
      <li>
        <Link href="/analysis" className="block active:bg-fill">
          <ListRow
            bare
            leading={<PieChart2LinearIcon className="size-6 text-muted-foreground" />}
            title={<span className="font-semibold">Análise de {monthName(month)}</span>}
            subtitle={summary
              ? <><Money size="inherit" tone="inherit" cents={summary.spending} mask={hidden ? HIDDEN_MONEY : undefined} /> gastos até agora</>
              : ' '}
            chevron
          />
        </Link>
      </li>
    </ListGroup>
  )
}
