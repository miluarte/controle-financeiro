'use client'

import { useState } from 'react'
import { Stat } from '@/components/ios/stat'
import { LoadingBlock } from '@/components/shared/loading-dots'
import { EmptyState } from '@/components/shared/empty-state'
import { Money } from '@/components/shared/money'
import { MonthBarChart } from '@/components/shared/month-bar-chart'
import { TransactionDayList } from '@/components/transactions/transaction-day-list'
import { useShowTransaction } from '@/components/transactions/use-show-transaction'
import { useCardStatement } from '@/hooks/use-card-statement'
import { currentMonth, monthName } from '@/lib/utils'

// Meus gastos em todos os cartões (os meus e os da família), pela fatura que vence em cada mês:
// gráfico por mês, total do mês escolhido e uma lista só com as compras de todos os cartões, por dia.
export function CardStatement() {
  const [month, setMonth] = useState(currentMonth())
  const { months, purchases, total, hasCards, loading } = useCardStatement(month)
  const showTransaction = useShowTransaction()

  if (!loading && !hasCards) {
    return <EmptyState variant="block" title="Nenhum cartão de crédito">Cartões ficam em Ajustes &gt; Carteiras</EmptyState>
  }

  return (
    <div className="space-y-7">
      <MonthBarChart months={months} value={month} onChange={setMonth} />
      <dl>
        <Stat label={`Cartões em ${monthName(month)}`}>
          <Money as="dd" size="display" cents={total} />
        </Stat>
      </dl>
      {loading ? (
        <LoadingBlock />
      ) : (
        <TransactionDayList transactions={purchases} onSelect={showTransaction} fullPurchase={false}
          emptyText="Nenhuma compra nos cartões neste mês" />
      )}
    </div>
  )
}
