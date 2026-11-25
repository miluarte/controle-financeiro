'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
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
import { formatDate, todayIso } from '@/lib/utils'
import { DateField } from '@/components/shared/date-field'
import { feedback } from '@/lib/feedback'
import { useBillDelete } from './use-bill-delete'
import { Money } from '@/components/shared/money'
import { FormError } from '@/components/shared/form-error'
import { Note } from '@/components/shared/note'

// CON-6 e CON-9: pagar, desfazer pagamento, editar só este mês ou a série, encerrar.
// Receita fixa usa o mesmo fluxo: marcar como recebida gera a receita na carteira escolhida.
export function BillOccurrenceSheet({ occurrence, onClose, onEdit }: {
  occurrence: BillOccurrence | null; onClose: () => void; onEdit: (o: BillOccurrence) => void
}) {
  const del = useBillDelete(onClose)
  return (
    <>
      <ModalSheet open={!!occurrence} onOpenChange={o => { if (!o) onClose() }} title={occurrence?.bill.name ?? ''}
        onDelete={() => occurrence && del.ask(occurrence)}>
        {occurrence && <Body key={occurrence.id} o={occurrence} onDone={onClose} onEdit={() => onEdit(occurrence)} />}
      </ModalSheet>
      {del.sheet}
    </>
  )
}

function Body({ o, onDone, onEdit }: { o: BillOccurrence; onDone: () => void; onEdit: () => void }) {
  const { month } = useMonth()
  const { wallets } = useWallets()
  const { profile } = useProfile()
  const refresh = useRefresh()
  const income = o.bill.type === 'income'
  // receita não entra em cartão de crédito
  const payable = wallets.filter(w => !w.ownerName && (!income || w.type !== 'credit'))
  // a forma de pagamento do gasto fixo vem escolhida; senão, a carteira padrão
  const billWallet = payable.some(w => w.id === o.bill.walletId) ? o.bill.walletId : null
  const [walletId, setWalletId] = useState<string | null>(billWallet ?? profile?.defaultWalletId ?? payable[0]?.id ?? null)
  const [payDate, setPayDate] = useState(todayIso())
  const [amount, setAmount] = useState(o.amount)
  const [dueDate, setDueDate] = useState(o.dueDate)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(fn: () => Promise<void>, done: string) {
    setBusy(true); setError(null)
    try { await fn(); await refresh(); onDone(); feedback.done(done) }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível concluir.') }
    finally { setBusy(false) }
  }

  const changed = amount !== o.amount || dueDate !== o.dueDate
  const installment = o.installmentN ? `Parcela ${o.installmentN} de ${o.bill.installmentsTotal}` : o.bill.recurring ? 'Repete todo mês' : income ? 'Receita única' : 'Gasto único'

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Money as="p" size="display" cents={o.amount} />
        <p className="text-subheadline text-muted-foreground">{income ? 'Receber em' : 'Vence'} {formatDate(o.dueDate)} · {installment}</p>
        {o.bill.recipient && <p className="truncate text-subheadline text-muted-foreground">Para {o.bill.recipient.name}</p>}
      </div>

      {o.bill.onCard ? (
        <Note>
          {o.paidAt ? `Lançada no cartão em ${formatDate(o.paidAt)}.` : 'Entra sozinha na fatura do cartão.'}
        </Note>
      ) : o.paidAt ? (
        <ListGroup footer={income
          ? `Recebida em ${formatDate(o.paidAt)}.`
          : `Paga em ${formatDate(o.paidAt)}.`}>
          <li className="p-3">
            <Button variant="outline" size="lg" className="w-full" disabled={busy} onClick={() => run(() => billsApi.unpay(o.id), 'Pagamento desfeito')}>
              {income ? 'Desfazer recebimento' : 'Desfazer pagamento'}
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
              <DateField id="pay-date" value={payDate} onChange={v => setPayDate(v || todayIso())} />
            </FormRow>
          </ListGroup>
          <Button size="lg" className="w-full" disabled={busy || !walletId}
            onClick={() => run(() => billsApi.pay(o.id, walletId!, payDate), income ? 'Recebido' : 'Pago')}>
            {income ? 'Receber' : 'Pagar'}
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
              <DateField id="occ-due" value={dueDate} onChange={v => setDueDate(v || o.dueDate)} />
            </FormRow>
          </ListGroup>
          {changed && (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" size="lg" disabled={busy || amount <= 0}
                onClick={() => run(() => billsApi.updateOccurrence(o.id, amount, dueDate), 'Salvo')}>
                Só este mês
              </Button>
              <Button variant="secondary" size="lg" disabled={busy || amount <= 0}
                onClick={() => run(() => billsApi.updateSeries(o.billId, month, { amount, dueDay: Number(dueDate.slice(8, 10)) }), 'Salvo')}>
                Este e os próximos
              </Button>
            </div>
          )}
        </>
      )}

      <FormError message={error} />

      <Button variant="secondary" size="lg" className="w-full" disabled={busy} onClick={onEdit}>
        {income ? 'Editar receita' : 'Editar gasto'}
      </Button>
    </div>
  )
}
