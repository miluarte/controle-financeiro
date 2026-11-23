'use client'

import { useState } from 'react'
import { FormRow } from '@/components/ios/form-row'
import { ListGroup } from '@/components/ios/list-group'
import { ModalSheet } from '@/components/ios/modal-sheet'
import { CurrencyInput } from '@/components/shared/currency-input'
import { DateField } from '@/components/shared/date-field'
import { WalletPicker } from '@/components/shared/wallet-picker'
import { useCardPeople } from '@/hooks/use-card-people'
import { useProfile } from '@/hooks/use-profile'
import { useRefresh } from '@/hooks/use-refresh'
import { useWallets } from '@/hooks/use-wallets'
import { sharedApi } from '@/lib/api/shared'
import { feedback } from '@/lib/feedback'
import type { SharedDebt } from '@/lib/types'
import { formatCurrency, todayIso } from '@/lib/utils'

// Acerto de um Pix dividido. report: quem deve informa que pagou (quem pagou confirma).
// receive: quem pagou registra o que recebeu de uma pessoa sem o app.
export function SharedSettlementSheet({ open, onOpenChange, debt, mode }: {
  open: boolean; onOpenChange: (o: boolean) => void; debt: SharedDebt; mode: 'report' | 'receive'
}) {
  const [saving, setSaving] = useState(false)
  return (
    <ModalSheet open={open} onOpenChange={onOpenChange} title={mode === 'report' ? 'Informar acerto' : 'Registrar recebimento'}
      formId="shared-settlement" actionLabel={mode === 'report' ? 'Informar' : 'Registrar'} actionDisabled={saving}>
      {open && <Form debt={debt} mode={mode} onSaving={setSaving} onDone={() => onOpenChange(false)} />}
    </ModalSheet>
  )
}

function Form({ debt, mode, onSaving, onDone }: {
  debt: SharedDebt; mode: 'report' | 'receive'; onSaving: (v: boolean) => void; onDone: () => void
}) {
  const { wallets } = useWallets()
  const { profile } = useProfile()
  const { nameOf } = useCardPeople()
  const refresh = useRefresh()
  const mine = wallets.filter(w => !w.ownerName && w.type !== 'credit')
  const max = Math.max(debt.open - debt.reported, 0)
  const [amount, setAmount] = useState(max)
  const [date, setDate] = useState(todayIso())
  const [walletId, setWalletId] = useState<string | null>(mine.find(w => w.id === profile?.defaultWalletId)?.id ?? mine[0]?.id ?? null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const left = Math.max(max - amount, 0)
  const payer = nameOf(debt.payerId)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    if (amount <= 0 || !walletId) { setError('Informe o valor e a carteira.'); return }
    if (date > todayIso()) { setError('A data do pagamento não pode ser no futuro.'); return }
    setSaving(true); onSaving(true)
    try {
      if (mode === 'report') await sharedApi.report(debt.sharedPaymentId, amount, walletId, date)
      else await sharedApi.receive(debt.sharedPaymentId, debt.debtorId, amount, walletId, date)
      await refresh(); onDone(); feedback.done(mode === 'report' ? 'Acerto informado' : 'Recebimento registrado')
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível salvar.') }
    finally { setSaving(false); onSaving(false) }
  }

  const footer = [
    amount > 0 && left > 0 ? `Fica faltando ${formatCurrency(left)}.` : null,
    mode === 'report' ? `${payer} vai confirmar.` : 'Entra como receita (Reembolso).',
  ].filter(Boolean).join(' ')

  return (
    <form id="shared-settlement" onSubmit={save} className="space-y-6">
      <CurrencyInput id="shared-settle-amount" aria-label="Valor pago" variant="display" value={amount} onChange={setAmount} />
      <ListGroup footer={footer}>
        <WalletPicker id="shared-settle-wallet" label={mode === 'report' ? 'Saiu de' : 'Receber em'} wallets={mine} value={walletId} onChange={setWalletId} />
        <FormRow label="Data do pagamento" htmlFor="shared-settle-date">
          <DateField id="shared-settle-date" value={date} onChange={v => setDate(v || todayIso())} />
        </FormRow>
      </ListGroup>
      {error && <p className="px-4 text-footnote text-destructive">{error}</p>}
    </form>
  )
}
