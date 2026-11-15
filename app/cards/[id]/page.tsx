'use client'

import { useParams } from 'next/navigation'
import { MemberCardView } from '@/components/cards/member-card-view'
import { OwnerCardView } from '@/components/cards/owner-card-view'
import { LargeTitleHeader } from '@/components/ios/large-title-header'
import { CardPreview } from '@/components/wallets/card-preview'
import { useOwnWallets } from '@/hooks/use-data'
import { useWallets } from '@/hooks/use-wallets'

// Detalhe do cartão: visão do titular ou do membro com quem o cartão foi compartilhado.
export default function CardPage() {
  const { id } = useParams<{ id: string }>()
  const { wallets: own, loading } = useOwnWallets()
  const { wallets: usable } = useWallets()
  const mine = own.find(w => w.id === id)
  const shared = usable.find(w => w.id === id && w.ownerName)
  const wallet = mine ?? shared

  return (
    <>
      <LargeTitleHeader back title={wallet ? (shared ? `${wallet.name}, de ${wallet.ownerName}` : wallet.name) : 'Cartão'} />
      <div className="space-y-7 px-4 pt-2">
        {wallet && (
          <div className="flex justify-center">
            <CardPreview name={wallet.name} finish={wallet.finish} typeLabel="Crédito"
              subtitle={wallet.closingDay ? `Fecha dia ${wallet.closingDay} · vence dia ${wallet.dueDay}` : undefined} />
          </div>
        )}
        {mine && mine.type === 'credit' ? <OwnerCardView wallet={mine} />
          : shared ? <MemberCardView wallet={shared} />
          : !loading && <p className="text-subheadline text-muted-foreground">Cartão não encontrado.</p>}
      </div>
    </>
  )
}
