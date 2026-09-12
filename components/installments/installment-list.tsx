'use client'

import { useInstallments } from '@/hooks/use-installments'
import { InstallmentGroupCard } from './installment-group-card'

export function InstallmentList() {
  const { groups, loading, error } = useInstallments()

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>
  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (groups.length === 0)
    return <p className="text-sm text-muted-foreground">Nenhum parcelamento encontrado.</p>

  return (
    <div className="space-y-3">
      {groups.map(group => (
        <InstallmentGroupCard key={group.id} group={group} />
      ))}
    </div>
  )
}
