import { Badge } from '@/components/ui/badge'
import { DueBadge } from '@/components/bills/due-badge'
import { nextBusinessDay } from '@/lib/business-days'
import type { CardDebt } from '@/lib/types'

// Selo de uma fatura de cartão compartilhado: paga, acerto informado (aguardando o titular) ou vencimento.
// owe = eu devo (o acerto aguarda a outra pessoa); receive = me devem (o acerto é meu para confirmar).
export function InvoiceStatus({ debt, kind }: { debt: CardDebt; kind: 'owe' | 'receive' }) {
  if (debt.open <= 0) return <DueBadge dueDate={debt.dueDate} paid />
  const reported = debt.reported > 0
  return (
    <>
      {/* acerto informado que cobre o que falta: não fica como vencida */}
      {!(reported && debt.reported >= debt.open) && <DueBadge dueDate={nextBusinessDay(debt.dueDate)} paid={false} />}
      {reported && <Badge variant="warning">{kind === 'owe' ? 'Aguardando confirmação' : 'Para confirmar'}</Badge>}
    </>
  )
}
