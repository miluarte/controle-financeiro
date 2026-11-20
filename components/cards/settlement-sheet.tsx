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

// 5.7.8 passo 1: o membro informa que pagou ao titular (valor, data e de onde saiu).
export function SettlementSheet({
  open, onOpenChange, card, debts,
}: { open: boolean; onOpenChange: (o: boolean) => void; card: Wallet; debts: CardDebt[] }) {
  return (
    <ModalSheet open={open} onOpenChange={onOpenChange} title={`Paguei a ${card.ownerName ?? 'titular'}`} formId="settlement" actionLabel="Enviar">
      {open && <Form card={card} debts={debts} onDone={() => onOpenChange(false)} />}
    </ModalSheet>
  )
}

function Form({ card, debts, onDone }: { card: Wallet; debts: CardDebt[]; onDone: () => void }) {
  const { wallets } = useWallets()
  const { profile } = useProfile()
  const refresh = useRefresh()
  const mine = wallets.filter(w => !w.ownerName && w.type !== 'credit')
  const [ref, setRef] = useState(debts[0]?.invoiceRef ?? '')
  const [amount, setAmount] = useState(debts[0]?.open ?? 0)
  const [date, setDate] = useState(todayIso())
  const [walletId, setWalletId] = useState<string | null>(mine.find(w => w.id === profile?.defaultWalletId)?.id ?? mine[0]?.id ?? null)
  const [error, setError] = useState<string | null>(null)

  function pick(d: CardDebt) { setRef(d.invoiceRef); setAmount(d.open) }
  // pagamento parcial: o resto continua em aberto na fatura, para os dois
  const open = debts.find(d => d.invoiceRef === ref)?.open ?? 0
  const left = Math.max(open - amount, 0)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!ref || amount <= 0 || !walletId) { setError('Escolha a fatura, o valor e de onde saiu o dinheiro.'); return }
    try {
      await familyApi.reportSettlement(card.id, ref, amount, walletId, date)
      await refresh(); onDone()
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível enviar.') }
  }

  return (
    <form id="settlement" onSubmit={save} className="space-y-6">
      <CurrencyInput id="settle-amount" aria-label="Valor pago" variant="display" value={amount} onChange={setAmount} />
      <ListGroup footer={amount > 0 && left > 0 ? `Fica faltando ${formatCurrency(left)} nesta fatura. ${card.ownerName ?? 'O titular'} vai confirmar.` : `${card.ownerName ?? 'O titular'} vai confirmar.`}>
        <PickerRow id="settle-invoice" label="Fatura" value={ref}
          onChange={v => { const d = debts.find(x => x.invoiceRef === v); if (d) pick(d) }}
          options={debts.map(d => ({ value: d.invoiceRef, label: `${capitalize(monthName(d.invoiceRef.slice(0, 7), 'short'))} · ${formatCurrency(d.open)}` }))} />
        <WalletPicker id="settle-wallet" label="Saiu de" wallets={mine} value={walletId} onChange={setWalletId} />
      </ListGroup>
      <ListGroup>
        <FormRow label="Data" htmlFor="settle-date">
          <DateField id="settle-date" value={date} onChange={v => setDate(v || todayIso())} />
        </FormRow>
      </ListGroup>
      {error && <p className="px-4 text-footnote text-destructive">{error}</p>}
    </form>
  )
}
