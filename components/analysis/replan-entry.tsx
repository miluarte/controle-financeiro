'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { ReplanSheet } from '@/components/replan/replan-sheet'

// ANA-8 e ANA-9: atalhos para "Suas categorias" e "Replanejar metas" na Análise.
export function ReplanEntry() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  return (
    <>
      <ListGroup header="Metas">
        <ListRow title="Suas categorias" subtitle="Média por mês e sugestões" chevron onClick={() => router.push('/analysis/categories')} />
        <ListRow tone="tint" title="Replanejar metas" onClick={() => setOpen(true)} />
      </ListGroup>
      <ReplanSheet open={open} onOpenChange={setOpen} />
    </>
  )
}
