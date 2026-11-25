'use client'

import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { useClosings, useHistory } from '@/hooks/use-data'
import { capitalize, formatCurrency, monthLabel } from '@/lib/utils'
import { Money } from '@/components/shared/money'

// ANA-7: últimos meses com gastos, receitas e guardado reais.
export function HistoryList() {
  const { history } = useHistory(6)
  const closings = useClosings(12)
  const closingOf = (m: string) => closings.find(c => c.refMonth.slice(0, 7) === m.slice(0, 7))
  return (
    <ListGroup header="Últimos meses">
      {history.map(h => (
        <ListRow
          key={h.month}
          title={capitalize(monthLabel(h.month.slice(0, 7)))}
          subtitle={[`Receitas ${formatCurrency(h.income)}`, `Guardado ${formatCurrency(h.saved)}`,
            closingOf(h.month) ? `Fechou em ${formatCurrency(closingOf(h.month)!.closingBalance)}` : null].filter(Boolean).join(' · ')}
          trailing={<Money cents={h.spending} />}
        />
      ))}
    </ListGroup>
  )
}
