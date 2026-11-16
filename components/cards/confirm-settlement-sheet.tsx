'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ListGroup } from '@/components/ios/list-group'
import { ModalSheet } from '@/components/ios/modal-sheet'
import { WalletPicker } from '@/components/shared/wallet-picker'
import { useProfile } from '@/hooks/use-profile'
import { useRefresh } from '@/hooks/use-refresh'
import { useWallets } from '@/hooks/use-wallets'
import { familyApi } from '@/lib/api/family'
import type { Settlement } from '@/lib/types'
import { formatCurrency, formatDate, monthName } from '@/lib/utils'

// 5.7.8 passos 2 e 3: o titular confirma (o valor entra como reembolso) ou recusa.
export function ConfirmSettlementSheet({
  settlement, debtorName, onClose,
}: { settlement: Settlement | null; debtorName: string; onClose: () => void }) {
  return (
    <ModalSheet open={!!settlement} onOpenChange={o => { if (!o) onClose() }} title="Confirmar pagamento">
      {settlement && <Body key={settlement.id} s={settlement} name={debtorName} onDone={onClose} />}
    </ModalSheet>
  )
}

function Body({ s, name, onDone }: { s: Settlement; name: string; onDone: () => void }) {
  const { wallets } = useWallets()
  const { profile } = useProfile()
  const refresh = useRefresh()
  const mine = wallets.filter(w => !w.ownerName && w.type !== 'credit')
  const [walletId, setWalletId] = useState<string | null>(mine.find(w => w.id === profile?.defaultWalletId)?.id ?? mine[0]?.id ?? null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(fn: () => Promise<void>) {
    setBusy(true); setError(null)
    try { await fn(); await refresh(); onDone() }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível concluir.') }
    finally { setBusy(false) }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-large-title font-bold tabular-nums">{formatCurrency(s.amount)}</p>
        <p className="text-subheadline text-muted-foreground">
          {name} informou o pagamento da fatura de {monthName(s.invoiceRef.slice(0, 7))}
          {s.reportedAt ? ` em ${formatDate(s.reportedAt.slice(0, 10))}` : ''}
        </p>
      </div>
      <ListGroup header="Recebi em" footer="Entra como receita (Reembolso).">
        <WalletPicker wallets={mine} value={walletId} onChange={setWalletId} />
      </ListGroup>
      {error && <p className="px-4 text-footnote text-destructive">{error}</p>}
      <div className="space-y-2">
        <Button size="lg" className="w-full" disabled={busy || !walletId}
          onClick={() => run(() => familyApi.confirmSettlement(s.id, walletId!))}>
          Confirmar recebimento
        </Button>
        <Button variant="ghost" size="lg" className="w-full text-destructive" disabled={busy}
          onClick={() => { if (confirm('Recusar este pagamento? A pessoa recebe um aviso.')) run(() => familyApi.rejectSettlement(s.id)) }}>
          Não recebi
        </Button>
      </div>
    </div>
  )
}
