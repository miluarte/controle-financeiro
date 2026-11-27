import { ArrowDownLinearIcon, ArrowUpLinearIcon } from '@solar-icons/react'
import { Money } from '@/components/shared/money'

// Total de entradas ou saídas com a seta (para cima: entra; para baixo: sai), dentro de um <dl>.
// Mesma aparência no card de saldo do Início e no resumo de Transações.
const ICON = { in: ArrowUpLinearIcon, out: ArrowDownLinearIcon }

export function FlowStat({ direction, label, cents, mask }: {
  direction: 'in' | 'out'
  label: string
  cents: number
  mask?: string
}) {
  const Icon = ICON[direction]
  return (
    <div className="flex min-w-0 items-start gap-2">
      <Icon className="mt-0.5 size-5 shrink-0" />
      <div className="min-w-0">
        <dt className="truncate text-subheadline text-muted-foreground">{label}</dt>
        <Money as="dd" size="item" className="truncate" cents={cents} mask={mask} />
      </div>
    </div>
  )
}
