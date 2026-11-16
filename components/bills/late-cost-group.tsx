'use client'

import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { useInstitutionRates, useInstitutions } from '@/hooks/use-data'
import { daysBetween, lateCost, lateRules } from '@/lib/late-fee'
import type { OwnWallet } from '@/lib/types'
import { formatCurrency, todayIso } from '@/lib/utils'

// Quanto a fatura em aberto custaria com atraso, pelas regras da instituição do cartão.
export function LateCostGroup({ wallet, total, dueDate }: { wallet: OwnWallet; total: number; dueDate: string }) {
  const institutions = useInstitutions()
  const institution = institutions.find(i => i.id === wallet.institutionId)
  const bcb = useInstitutionRates().find(r => r.institutionId === wallet.institutionId && r.product === 'card_revolving')
  const rules = lateRules(wallet, institution, bcb?.monthlyRate)
  const fromBcb = wallet.revolvingRate == null && institution?.revolvingRate == null && bcb != null
  const late = daysBetween(dueDate, todayIso())
  const scenarios = late > 0 ? [late] : [5, 15, 30]
  const footer = rules.revolving == null
    ? 'Sem juros do rotativo: escolha o banco do cartão ou informe a taxa da fatura.'
    : `Rotativo ${rules.revolving.toLocaleString('pt-BR')}% a.m.${fromBcb ? ' (média do banco)' : ''} + mora ${rules.lateInterest}% + multa ${rules.lateFine}% + IOF. Estimativa.`

  return (
    <ListGroup header={late > 0 ? `Em atraso há ${late} ${late === 1 ? 'dia' : 'dias'}` : 'Se atrasar'} footer={footer}>
      {scenarios.map(d => {
        const c = lateCost(total, d, rules)
        return (
          <ListRow key={d}
            title={late > 0 ? 'Pagando hoje' : `${d} dias`}
            subtitle={`+${formatCurrency(c.total - total)} de juros e encargos`}
            trailing={<span className="text-body font-semibold tabular-nums text-destructive">{formatCurrency(c.total)}</span>} />
        )
      })}
    </ListGroup>
  )
}
