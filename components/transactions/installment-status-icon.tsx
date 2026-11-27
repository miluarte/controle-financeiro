import { cva } from 'class-variance-authority'
import { CheckCircleLinearIcon, ClockCircleLinearIcon, DocumentTextLinearIcon } from '@solar-icons/react'
import type { InstallmentStatus } from '@/lib/installments'

// Ícone da situação da parcela: fechada (verde), atual (azul, a fatura aberta) e futura (âmbar).
const statusIconVariants = cva('size-5 shrink-0', {
  variants: {
    status: {
      closed: 'text-success',
      current: 'text-info',
      future: 'text-warning',
    },
  },
})

const ICON = {
  closed: CheckCircleLinearIcon,
  current: DocumentTextLinearIcon,
  future: ClockCircleLinearIcon,
} as const

export function InstallmentStatusIcon({ status }: { status: InstallmentStatus }) {
  const Icon = ICON[status]
  return <Icon aria-hidden className={statusIconVariants({ status })} />
}
