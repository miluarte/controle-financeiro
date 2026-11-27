'use client'

import { Button } from '@/components/ui/button'
import { FamilyPanel } from '@/components/family/family-panel'
import { NoFamily } from '@/components/family/no-family'
import { LargeTitleHeader } from '@/components/ios/large-title-header'
import { useFamily } from '@/hooks/use-family'
import { useRefresh } from '@/hooks/use-refresh'
import { familyApi } from '@/lib/api/family'
import { LoadingBlock } from '@/components/shared/loading-dots'
import { feedback } from '@/lib/feedback'

export default function FamilyPage() {
  const { family, status, role, loading } = useFamily()
  const refresh = useRefresh()

  return (
    <>
      <LargeTitleHeader title="Família" />
      <div className="px-4 pt-2">
        {loading ? (
          <LoadingBlock />
        ) : !family || !status ? (
          <NoFamily />
        ) : status === 'pending' ? (
          <div className="space-y-4 py-10 text-center">
            <p className="text-headline">Aguardando aprovação</p>
            <p className="text-subheadline text-muted-foreground">Seu pedido para entrar em “{family.name}” foi enviado ao admin.</p>
            <Button variant="secondary" size="lg" className="w-full" onClick={async () => { await familyApi.leave(); await refresh(); feedback.done('Pedido cancelado') }}>
              Cancelar pedido
            </Button>
          </div>
        ) : (
          <FamilyPanel family={family} isAdmin={role === 'admin'} />
        )}
      </div>
    </>
  )
}
