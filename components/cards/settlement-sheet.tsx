'use client'

import { useState } from 'react'
import { PickerRow } from '@/components/shared/picker-row'
import { FormRow } from '@/components/ios/form-row'
import { ListGroup } from '@/components/ios/list-group'
import { ModalSheet } from '@/components/ios/modal-sheet'
import { CurrencyInput } from '@/components/shared/currency-input'
import { WalletPicker } from '@/components/shared/wallet-picker'
import { useProfile } from '@/hooks/use-profile'
import { useRefresh } from '@/hooks/use-refresh'
import { useWallets } from '@/hooks/use-wallets'
import { familyApi } from '@/lib/api/family'
import type { CardDebt, Wallet } from '@/lib/types'
import { capitalize, formatCurrency, monthName, todayIso } from '@/lib/utils'
import { DateField } from '@/components/shared/date-field'
import { feedback } from '@/lib/feedback'

// 5.7.8 passo 1: o membro informa que pagou ao titular (valor, data e de onde saiu).
export function SettlementSheet({
  open, onOpenChange, card, debts,
}: { open: boolean; onOpenChange: (o: boolean) => void; card: Wallet; debts: CardDebt[] }) {
  const [saving, setSaving] = useState(false)
  return (
    <ModalSheet open={open} onOpenChange={onOpenChange} title="Informar acerto" formId="settlement" actionLabel="Informar" actionDisabled={saving}>
      {open && <Form card={card} debts={debts} onSaving={setSaving} onDone={() => onOpenChange(false)} />}
    </ModalSheet>
  )
}

// o que ainda falta informar: o aberto menos o que já foi informado e aguarda o titular
const toReport = (d: CardDebt) => Math.max(d.open - d.reported, 0)

function Form({ card, debts, onSaving, onDone }: {
  card: Wallet; debts: CardDebt[]; onSaving: (v: boolean) => void; onDone: () => void
}) {
  const { wallets } = useWallets()
  const { profile } = useProfile()
  const refresh = useRefresh()
  const mine = wallets.filter(w => !w.ownerName && w.type !== 'credit')
  const [ref, setRef] = useState(debts[0]?.invoiceRef ?? '')
  const [amount, setAmount] = useState(debts[0] ? toReport(debts[0]) : 0)
  const [date, setDate] = useState(todayIso())
  const [walletId, setWalletId] = useState<string | null>(mine.find(w => w.id === profile?.defaultWalletId)?.id ?? mine[0]?.id ?? null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function pick(d: CardDebt) { setRef(d.invoiceRef); setAmount(toReport(d)) }
  // pagamento parcial: o resto continua em aberto na fatura, para os dois
  const debt = debts.find(d => d.invoiceRef === ref)
  const left = Math.max((debt ? toReport(debt) : 0) - amount, 0)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    if (!ref || amount <= 0 || !walletId) { setError('Escolha a fatura, o valor e de onde saiu o dinheiro.'); return }
    if (date > todayIso()) { setError('A data do pagamento não pode ser no futuro.'); return }
    setSaving(true); onSaving(true)
    try {
      await familyApi.reportSettlement(card.id, ref, amount, walletId, date)
      await refresh(); onDone(); feedback.done('Acerto informado')
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível informar.') }
    finally { setSaving(false); onSaving(false) }
  }

  return (
    <form id="settlement" onSubmit={save} className="space-y-6">
      <CurrencyInput id="settle-amount" aria-label="Valor pago" variant="display" value={amount} onChange={setAmount} />
      <ListGroup footer={amount > 0 && left > 0 ? `Fica faltando ${formatCurrency(left)} nesta fatura. ${card.ownerName ?? 'O titular'} vai confirmar.` : `${card.ownerName ?? 'O titular'} vai confirmar.`}>
        <PickerRow id="settle-invoice" label="Fatura" value={ref}
          onChange={v => { const d = debts.find(x => x.invoiceRef === v); if (d) pick(d) }}
          options={debts.map(d => ({ value: d.invoiceRef, label: `${capitalize(monthName(d.invoiceRef.slice(0, 7), 'short'))} · ${formatCurrency(toReport(d))}` }))} />
        <WalletPicker id="settle-wallet" label="Saiu de" wallets={mine} value={walletId} onChange={setWalletId} />
      </ListGroup>
      {/* dia em que pagou de fato (pode ter pago no prazo e informado depois) */}
      <ListGroup footer={debt && date <= debt.dueDate ? 'Pago dentro do vencimento.' : undefined}>
        <FormRow label="Data do pagamento" htmlFor="settle-date">
          <DateField id="settle-date" value={date} onChange={v => setDate(v || todayIso())} />
        </FormRow>
      </ListGroup>
      {error && <p className="px-4 text-footnote text-destructive">{error}</p>}
    </form>
  )
}
