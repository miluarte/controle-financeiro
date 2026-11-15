'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormRow } from '@/components/ios/form-row'
import { ListGroup } from '@/components/ios/list-group'
import { ModalSheet } from '@/components/ios/modal-sheet'
import { CurrencyInput } from '@/components/shared/currency-input'
import { WalletPicker } from '@/components/shared/wallet-picker'
import { useMonth } from '@/hooks/use-month'
import { useProfile } from '@/hooks/use-profile'
import { useRefresh } from '@/hooks/use-refresh'
import { useWallets } from '@/hooks/use-wallets'
import { billsApi } from '@/lib/api/bills'
import type { BillOccurrence } from '@/lib/types'
import { formatCurrency, formatDate, todayIso } from '@/lib/utils'

// CON-6 e CON-9: pagar, desfazer pagamento, editar só este mês ou a série, encerrar.
// Receita fixa usa o mesmo fluxo: marcar como recebida gera a receita na carteira escolhida.
export function BillOccurrenceSheet({ occurrence, onClose }: { occurrence: BillOccurrence | null; onClose: () => void }) {
  return (
    <ModalSheet open={!!occurrence} onOpenChange={o => { if (!o) onClose() }} title={occurrence?.bill.name ?? ''}>
      {occurrence && <Body key={occurrence.id} o={occurrence} onDone={onClose} />}
    </ModalSheet>
  )
}

function Body({ o, onDone }: { o: BillOccurrence; onDone: () => void }) {
  const { month } = useMonth()
  const { wallets } = useWallets()
  const { profile } = useProfile()
  const refresh = useRefresh()
  const income = o.bill.type === 'income'
  // receita não entra em cartão de crédito
  const payable = wallets.filter(w => !w.ownerName && (!income || w.type !== 'credit'))
  const [walletId, setWalletId] = useState<string | null>(profile?.defaultWalletId ?? payable[0]?.id ?? null)
  const [payDate, setPayDate] = useState(todayIso())
  const [amount, setAmount] = useState(o.amount)
  const [dueDate, setDueDate] = useState(o.dueDate)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(fn: () => Promise<void>) {
    setBusy(true); setError(null)
    try { await fn(); await refresh(); onDone() }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível concluir.') }
    finally { setBusy(false) }
  }

  const changed = amount !== o.amount || dueDate !== o.dueDate
  const installment = o.installmentN ? `Parcela ${o.installmentN} de ${o.bill.installmentsTotal}` : o.bill.recurring ? 'Repete todo mês' : income ? 'Receita única' : 'Conta única'

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-large-title font-bold tabular-nums">{formatCurrency(o.amount)}</p>
        <p className="text-subheadline text-muted-foreground">{income ? 'Receber em' : 'Vence'} {formatDate(o.dueDate)} · {installment}</p>
      </div>

      {o.paidAt ? (
        <ListGroup footer={income
          ? `Recebida em ${formatDate(o.paidAt)}. A receita foi registrada nas suas transações.`
          : `Paga em ${formatDate(o.paidAt)}. O gasto foi registrado nas suas transações.`}>
          <li className="p-3">
            <Button variant="outline" size="lg" className="w-full" disabled={busy} onClick={() => run(() => billsApi.unpay(o.id))}>
              {income ? 'Desmarcar recebimento' : 'Desmarcar pagamento'}
            </Button>
          </li>
        </ListGroup>
      ) : (
        <>
          <ListGroup header={income ? 'Receber em' : 'Pagar com'}>
            <WalletPicker wallets={payable} value={walletId} onChange={setWalletId} />
          </ListGroup>
          <ListGroup>
            <FormRow label={income ? 'Data do recebimento' : 'Data do pagamento'} htmlFor="pay-date">
              <Input id="pay-date" type="date" variant="bare" value={payDate} onChange={e => setPayDate(e.target.value || todayIso())} className="w-auto text-right" />
            </FormRow>
          </ListGroup>
          <Button size="lg" className="w-full" disabled={busy || !walletId}
            onClick={() => run(() => billsApi.pay(o.id, walletId!, payDate))}>
            {income ? 'Marcar como recebida' : 'Marcar como paga'}
          </Button>
        </>
      )}

      {!o.paidAt && (
        <>
          <ListGroup header="Editar">
            <FormRow label="Valor" htmlFor="occ-amount">
              <CurrencyInput id="occ-amount" variant="bare" value={amount} onChange={setAmount} className="text-right" />
            </FormRow>
            <FormRow label={income ? 'Dia de receber' : 'Vencimento'} htmlFor="occ-due">
              <Input id="occ-due" type="date" variant="bare" value={dueDate} onChange={e => setDueDate(e.target.value || o.dueDate)} className="w-auto text-right" />
            </FormRow>
          </ListGroup>
          {changed && (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" size="lg" disabled={busy || amount <= 0}
                onClick={() => run(() => billsApi.updateOccurrence(o.id, amount, dueDate))}>
                Só este mês
              </Button>
              <Button variant="secondary" size="lg" disabled={busy || amount <= 0}
                onClick={() => run(() => billsApi.updateSeries(o.billId, month, { amount, dueDay: Number(dueDate.slice(8, 10)) }))}>
                Este e os próximos
              </Button>
            </div>
          )}
        </>
      )}

      {error && <p className="px-4 text-footnote text-destructive">{error}</p>}

      <Button variant="ghost" size="lg" className="w-full text-destructive" disabled={busy}
        onClick={() => {
          const msg = income
            ? 'Encerrar esta receita a partir deste mês? Os meses já recebidos continuam no histórico.'
            : 'Encerrar esta conta a partir deste mês? Os meses já pagos continuam no histórico.'
          if (confirm(msg)) run(() => billsApi.endSeries(o.billId, month))
        }}>
        {income ? 'Encerrar receita' : 'Encerrar conta'}
      </Button>
    </div>
  )
}
