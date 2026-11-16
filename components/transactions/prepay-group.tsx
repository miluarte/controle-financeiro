'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FormRow } from '@/components/ios/form-row'
import { ListGroup } from '@/components/ios/list-group'
import { DateField } from '@/components/shared/date-field'
import { WalletPicker } from '@/components/shared/wallet-picker'
import { useProfile } from '@/hooks/use-profile'
import { useRefresh } from '@/hooks/use-refresh'
import { useWallets } from '@/hooks/use-wallets'
import { transactionsApi } from '@/lib/api/transactions'
import type { Transaction } from '@/lib/types'
import { todayIso } from '@/lib/utils'

// Pagar uma compra do cartão (ou só esta parcela) antes da fatura. O valor sai do caixa na data
// escolhida e deixa de entrar no valor a pagar da fatura.
export function PrepayGroup({ t, onDone }: { t: Transaction; onDone: () => void }) {
  const { wallets } = useWallets()
  const { profile } = useProfile()
  const refresh = useRefresh()
  const payable = wallets.filter(w => !w.ownerName && w.type !== 'credit')
  const [walletId, setWalletId] = useState<string | null>(
    payable.find(w => w.id === profile?.defaultWalletId)?.id ?? payable[0]?.id ?? null)
  const [date, setDate] = useState(todayIso())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const what = t.installmentN ? 'esta parcela' : 'esta compra'

  async function run(fn: () => Promise<void>) {
    setBusy(true); setError(null)
    try { await fn(); await refresh(); onDone() }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível concluir.') }
    finally { setBusy(false) }
  }

  if (t.prepaidBy) {
    return (
      <ListGroup header="Pago antes da fatura" footer={error ?? undefined}>
        <li className="p-3">
          <Button type="button" variant="secondary" className="w-full" disabled={busy} onClick={() => run(() => transactionsApi.undoPrepay(t.id))}>
            Desfazer pagamento
          </Button>
        </li>
      </ListGroup>
    )
  }

  return (
    <ListGroup header={`Pagar ${what} antes da fatura`} footer={error ?? undefined}>
      <WalletPicker wallets={payable} value={walletId} onChange={setWalletId} />
      <FormRow label="Data do pagamento" htmlFor="prepay-date">
        <DateField id="prepay-date" value={date} onChange={v => setDate(v || todayIso())} />
      </FormRow>
      <li className="p-3">
        <Button type="button" variant="secondary" className="w-full" disabled={busy || !walletId}
          onClick={() => run(() => transactionsApi.prepay(t.id, walletId!, date))}>
          Marcar como paga
        </Button>
      </li>
    </ListGroup>
  )
}
