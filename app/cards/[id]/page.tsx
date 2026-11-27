'use client'

import { Suspense, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { MemberCardView } from '@/components/cards/member-card-view'
import { OwnerCardView } from '@/components/cards/owner-card-view'
import { LargeTitleHeader } from '@/components/ios/large-title-header'
import { GlassButton } from '@/components/ios/glass-button'
import { CardPreview } from '@/components/wallets/card-preview'
import { WalletFormSheet } from '@/components/wallets/wallet-form-sheet'
import { useOwnWallets } from '@/hooks/use-data'
import { useWallets } from '@/hooks/use-wallets'
import { walletLabel } from '@/lib/utils'

// Detalhe do cartão: visão do titular ou do membro com quem o cartão foi compartilhado.
// ?fatura=AAAA-MM abre nessa fatura.
export default function CardPage() {
  return <Suspense><CardContent /></Suspense>
}

function CardContent() {
  const { id } = useParams<{ id: string }>()
  const initialRef = useSearchParams().get('fatura')
  const { wallets: own, loading } = useOwnWallets()
  const { wallets: usable } = useWallets()
  const mine = own.find(w => w.id === id)
  const shared = usable.find(w => w.id === id && w.ownerName)
  const wallet = mine ?? shared
  const [editing, setEditing] = useState(false)

  return (
    <>
      <LargeTitleHeader title={wallet ? (shared ? `${walletLabel(wallet)}, de ${wallet.ownerName}` : walletLabel(wallet)) : 'Cartão'}
        actions={mine ? <GlassButton size="capsule" onClick={() => setEditing(true)}>Editar</GlassButton> : undefined} />
      <div className="space-y-7 px-4 pt-2">
        {wallet && (
          <div className="flex justify-center">
            <CardPreview name={wallet.name} finish={wallet.finish} typeLabel="Crédito"
              subtitle={wallet.closingDay ? `Fecha dia ${wallet.closingDay} · vence dia ${wallet.dueDay}` : undefined} />
          </div>
        )}
        {mine && mine.type === 'credit' ? <OwnerCardView wallet={mine} initialRef={initialRef} />
          : shared ? <MemberCardView wallet={shared} />
          : !loading && <p className="text-subheadline text-muted-foreground">Cartão não encontrado.</p>}
      </div>
      {mine && <WalletFormSheet open={editing} wallet={mine} onClose={() => setEditing(false)} />}
    </>
  )
}
