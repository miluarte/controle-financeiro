'use client'

import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'

// Aviso colorido em card (Início): fundo no tom do estado, título e ícone no tom 900,
// descrição e seta no tom 600 (tokens --status-<estado>-content e -content-secondary).
type AlertTone = 'warning' | 'danger'

interface AlertCardProps {
  tone: AlertTone
  icon: React.ComponentType<{ className?: string }>
  title: React.ReactNode
  subtitle?: React.ReactNode
  onClick: () => void
}

const iconTone: Record<AlertTone, string> = { warning: 'text-warning-content', danger: 'text-danger-content' }

export function AlertCard({ tone, icon: Icon, title, subtitle, onClick }: AlertCardProps) {
  return (
    <ListGroup variant={tone}>
      <ListRow tone={tone} chevron onClick={onClick}
        leading={<Icon className={`size-6 ${iconTone[tone]}`} />}
        title={<span className="text-subheadline font-semibold">{title}</span>}
        subtitle={subtitle} />
    </ListGroup>
  )
}
