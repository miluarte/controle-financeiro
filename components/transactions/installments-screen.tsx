'use client'

import useSWR from 'swr'
import { LargeTitleHeader } from '@/components/ios/large-title-header'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { LoadingBlock } from '@/components/shared/loading-dots'
import { Money } from '@/components/shared/money'
import { useTransaction } from '@/hooks/use-transaction'
import { transactionsApi } from '@/lib/api/transactions'
import { INSTALLMENT_STATUS_LABEL, installmentLines } from '@/lib/installments'
import { formatCurrency, shortDate } from '@/lib/utils'
import { InstallmentStatusIcon } from './installment-status-icon'

// Parcelamento da compra: valor total, "12x de R$ 57,43" e cada parcela com a data e a situação
// (Fechada, Atual ou Futura). Abre pela linha Parcelas do detalhe.
export function InstallmentsScreen({ id }: { id: string }) {
  const { t, info, wallet } = useTransaction(id)
  const groupId = t?.installmentGroupId ?? null
  const { data: rows } = useSWR(groupId ? ['installment-group', groupId] : null, () => transactionsApi.getGroup(groupId!))
  const n = info?.installments ?? t?.installmentsTotal ?? 1
  const lines = rows ? installmentLines(rows, n, info?.firstDate ?? null, wallet) : null
  // compra dividida: as parcelas listadas são as suas, então o total também é o da sua parte
  const split = Array.isArray(t?.sourceData?.split_parts)
  const total = split && lines ? lines.reduce((sum, l) => sum + (l.amount ?? t!.amount), 0) : info?.total ?? (t ? t.amount * n : 0)

  return (
    <>
      <LargeTitleHeader back title="Parcelas" />
      <div className="space-y-7 px-4 pt-2 pb-8">
        {!t || !lines ? <LoadingBlock /> : (
          <>
            <ListGroup>
              <ListRow title={split ? 'Sua parte' : 'Valor total'} trailing={<Money cents={total} size="rowRegular" />} />
              <ListRow title="Parcelamento" trailing={`${n}x de ${formatCurrency(Math.round(total / n))}`} />
            </ListGroup>
            <ListGroup header="Parcelas">
              {lines.map(l => (
                <ListRow key={l.n}
                  title={<span className={l.n === t.installmentN ? 'font-semibold' : undefined}>{`${l.n}ª · ${shortDate(l.date)}`}</span>}
                  subtitle={l.before ? `${INSTALLMENT_STATUS_LABEL[l.status]} · antes do app` : INSTALLMENT_STATUS_LABEL[l.status]}
                  trailing={
                    <span className="flex items-center gap-2">
                      {l.amount != null && <Money cents={l.amount} size="rowRegular" tone="muted" />}
                      <InstallmentStatusIcon status={l.status} />
                    </span>
                  } />
              ))}
            </ListGroup>
          </>
        )}
      </div>
    </>
  )
}
