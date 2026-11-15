import { Badge } from '@/components/ui/badge'
import { todayIso } from '@/lib/utils'

// CON-7: paga, vencida ou perto do vencimento. Receita fixa: recebida, atrasada ou perto do dia.
export function DueBadge({ dueDate, paid, income = false }: { dueDate: string; paid: boolean; income?: boolean }) {
  if (paid) return <Badge variant="success">{income ? 'Recebida' : 'Paga'}</Badge>
  const today = todayIso()
  const days = Math.round((new Date(`${dueDate}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) / 86400000)
  if (income) {
    if (days < 0) return <Badge variant="secondary">Atrasada</Badge>
    if (days === 0) return <Badge variant="secondary">Hoje</Badge>
    return null
  }
  if (days < 0) return <Badge variant="destructive">Vencida</Badge>
  if (days === 0) return <Badge variant="destructive">Vence hoje</Badge>
  if (days <= 3) return <Badge variant="secondary">Vence em {days} {days === 1 ? 'dia' : 'dias'}</Badge>
  return null
}
