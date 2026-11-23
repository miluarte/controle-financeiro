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
import { feedback } from '@/lib/feedback'
import { ButtonRow } from '@/components/ios/button-row'
import { useConfirmDelete } from '@/components/ios/use-delete-action'

// 5.7.8 passos 2 e 3: o titular confirma (o valor entra como reembolso) ou recusa.
export function ConfirmSettlementSheet({
  settlement, debtorName, onClose,
}: { settlement: Settlement | null; debtorName: string; onClose: () => void }) {
  return (
    <ModalSheet open={!!settlement} onOpenChange={o => { if (!o) onClose() }} title="Acerto">
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
  const ask = useConfirmDelete()
  const [error, setError] = useState<string | null>(null)

  async function run(fn: () => Promise<void>, done: string) {
    setBusy(true); setError(null)
    try { await fn(); await refresh(); onDone(); feedback.done(done) }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível concluir.') }
    finally { setBusy(false) }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-large-title font-bold tabular-nums">{formatCurrency(s.amount)}</p>
        <p className="text-subheadline text-muted-foreground">
          {name} pagou {s.paidOn ? `em ${formatDate(s.paidOn)} ` : ''}{s.invoiceRef ? `a fatura de ${monthName(s.invoiceRef.slice(0, 7))}` : 'a parte do Pix dividido'}
        </p>
      </div>
      <ListGroup header="Receber em" footer="Entra como receita (Reembolso) no dia do pagamento.">
        <WalletPicker wallets={mine} value={walletId} onChange={setWalletId} />
      </ListGroup>
      {error && <p className="px-4 text-footnote text-destructive">{error}</p>}
      {ask.sheet}
      <ButtonRow>
        <Button variant="destructive" size="lg" disabled={busy}
          onClick={() => ask.ask({ title: 'Recusar acerto? A pessoa recebe um aviso.', label: 'Recusar', done: 'Acerto recusado',
            remove: async () => { await familyApi.rejectSettlement(s.id); onDone() } })}>
          Recusar
        </Button>
        <Button size="lg" disabled={busy || !walletId}
          onClick={() => run(() => familyApi.confirmSettlement(s.id, walletId!), 'Acerto confirmado')}>
          Confirmar
        </Button>
      </ButtonRow>
    </div>
  )
}
