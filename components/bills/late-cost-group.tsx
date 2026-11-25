'use client'

import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { useInstitutionRates, useInstitutions } from '@/hooks/use-data'
import { nextBusinessDay } from '@/lib/business-days'
import { daysBetween, lateCost, lateRules } from '@/lib/late-fee'
import type { OwnWallet } from '@/lib/types'
import { formatCurrency, todayIso } from '@/lib/utils'
import { Money } from '@/components/shared/money'

// Quanto a fatura em aberto custaria com atraso, pelas regras da instituição do cartão.
export function LateCostGroup({ wallet, total, dueDate }: { wallet: OwnWallet; total: number; dueDate: string }) {
  const institutions = useInstitutions()
  const institution = institutions.find(i => i.id === wallet.institutionId)
  const bcb = useInstitutionRates().find(r => r.institutionId === wallet.institutionId && r.product === 'card_revolving')
  const rules = lateRules(wallet, institution, bcb?.monthlyRate)
  const fromBcb = wallet.revolvingRate == null && institution?.revolvingRate == null && bcb != null
  // venceu em dia sem expediente: paga no próximo dia útil sem encargos
  const payUntil = nextBusinessDay(dueDate)
  const late = daysBetween(payUntil, todayIso())
  const scenarios = late > 0 ? [late] : [5, 15, 30]
  const footer = rules.revolving == null
    ? 'Sem juros do rotativo: escolha o banco do cartão ou informe a taxa da fatura.'
    : `Rotativo ${rules.revolving.toLocaleString('pt-BR')}% a.m.${fromBcb ? ' (média do banco)' : ''} + mora ${rules.lateInterest}% + multa ${rules.lateFine}% + IOF. Estimativa.`

  const moved = payUntil !== dueDate && late <= 0
    ? `Vence em dia sem expediente: dá para pagar até ${payUntil.slice(8, 10)}/${payUntil.slice(5, 7)} sem multa. `
    : ''
  return (
    <ListGroup header={late > 0 ? `Em atraso há ${late} ${late === 1 ? 'dia' : 'dias'}` : 'Se atrasar'} footer={moved + footer}>
      {scenarios.map(d => {
        const c = lateCost(total, d, rules)
        return (
          <ListRow key={d}
            title={late > 0 ? 'Pagando hoje' : `${d} dias`}
            subtitle={`+${formatCurrency(c.total - total)} de juros e encargos`}
            trailing={<Money cents={c.total} tone="danger" />} />
        )
      })}
    </ListGroup>
  )
}
