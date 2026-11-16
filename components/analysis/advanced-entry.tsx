'use client'

import { useRouter } from 'next/navigation'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'

// Atalhos da camada analítica no fim da Análise.
export function AdvancedEntry() {
  const router = useRouter()
  return (
    <ListGroup header="Planejamento">
      <ListRow title="Objetivos" subtitle="Quando cada um fica pronto" chevron onClick={() => router.push('/analysis/goals')} />
      <ListRow title="Assinaturas" subtitle="Custo por uso" chevron onClick={() => router.push('/analysis/subscriptions')} />
      <ListRow title="Veículos" subtitle="Custo de deslocamento" chevron onClick={() => router.push('/analysis/vehicles')} />
    </ListGroup>
  )
}
