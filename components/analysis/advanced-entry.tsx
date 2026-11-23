'use client'

import { useRouter } from 'next/navigation'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'

// Planejamento oculto por enquanto (2026-11-23). As telas e rotas continuam; trocar para true para mostrar de novo.
export const SHOW_PLANNING = false

// Atalhos da camada analítica no fim da Análise.
export function AdvancedEntry() {
  const router = useRouter()
  if (!SHOW_PLANNING) return null
  return (
    <ListGroup header="Planejamento">
      <ListRow title="Objetivos" subtitle="Quando cada um fica pronto" chevron onClick={() => router.push('/analysis/goals')} />
      <ListRow title="Assinaturas" subtitle="Custo por uso" chevron onClick={() => router.push('/analysis/subscriptions')} />
      <ListRow title="Veículos" subtitle="Custo de deslocamento" chevron onClick={() => router.push('/analysis/vehicles')} />
      <ListRow title="Simular crédito" subtitle="Empréstimo, cheque especial, cartão" chevron onClick={() => router.push('/analysis/credit')} />
    </ListGroup>
  )
}
