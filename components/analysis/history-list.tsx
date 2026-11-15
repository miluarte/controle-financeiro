'use client'

import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { useHistory } from '@/hooks/use-data'
import { capitalize, formatCurrency, monthLabel } from '@/lib/utils'

// ANA-7: últimos meses com gastos, receitas e guardado reais.
export function HistoryList() {
  const { history } = useHistory(6)
  return (
    <ListGroup header="Últimos meses">
      {history.map(h => (
        <ListRow
          key={h.month}
          title={capitalize(monthLabel(h.month.slice(0, 7)))}
          subtitle={`Receitas ${formatCurrency(h.income)} · Guardado ${formatCurrency(h.saved)}`}
          trailing={<span className="text-body font-semibold tabular-nums text-foreground">{formatCurrency(h.spending)}</span>}
        />
      ))}
    </ListGroup>
  )
}
