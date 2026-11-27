'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { useMyDebts } from '@/hooks/use-family'
import type { Transaction, Wallet } from '@/lib/types'
import { capitalize, monthName } from '@/lib/utils'
import { SettlementSheet } from './settlement-sheet'

// Compra minha no cartão de outra pessoa da família: informar o acerto direto da compra,
// já com o valor dela (ou da parcela) e a fatura em que ela entrou.
export function SettlePurchaseGroup({ t, card }: { t: Transaction; card: Wallet }) {
  const [open, setOpen] = useState(false)
  const debt = useMyDebts().find(d => d.walletId === card.id && d.invoiceRef === t.invoiceRef)
  if (!debt) return null
  const what = t.installmentN ? 'esta parcela' : 'esta compra'
  const month = capitalize(monthName(debt.invoiceRef.slice(0, 7), 'short'))

  // fatura toda acertada, ou acerto informado esperando a titular confirmar
  if (debt.open <= 0 || debt.reported > 0) {
    return (
      <ListGroup header="Acerto">
        <ListRow title={`Fatura de ${month}`}
          trailing={debt.open <= 0 ? <Badge variant="success">Acertada</Badge> : <Badge variant="warning">Aguardando confirmação</Badge>} />
      </ListGroup>
    )
  }
  return (
    <>
      <ListGroup header="Acerto" footer={`Já pagou ${what} a ${card.ownerName}? Informe aqui.`}>
        <li className="p-3">
          <Button type="button" variant="secondary" className="w-full" onClick={() => setOpen(true)}>
            Informar acerto
          </Button>
        </li>
      </ListGroup>
      <SettlementSheet open={open} onOpenChange={setOpen} card={card} debts={[debt]} initialAmount={t.amount} />
    </>
  )
}
