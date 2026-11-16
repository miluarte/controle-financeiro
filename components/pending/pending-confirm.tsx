'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormRow } from '@/components/ios/form-row'
import { ListGroup } from '@/components/ios/list-group'
import { ChoiceChip } from '@/components/shared/choice-chip'
import { CurrencyInput } from '@/components/shared/currency-input'
import { TokenIcon } from '@/components/shared/token-icon'
import { WalletPicker } from '@/components/shared/wallet-picker'
import { useCategories } from '@/hooks/use-categories'
import { useProfile } from '@/hooks/use-profile'
import { useRefresh } from '@/hooks/use-refresh'
import { useWallets } from '@/hooks/use-wallets'
import { automationsApi } from '@/lib/api/automations'
import { transactionsApi } from '@/lib/api/transactions'
import type { Transaction } from '@/lib/types'
import { todayIso } from '@/lib/utils'
import { DateField } from '@/components/shared/date-field'

// Confirmar um gasto que chegou pela automação: ajusta valor, local, categoria e carteira.
export function PendingConfirm({ t, onDone }: { t: Transaction; onDone: () => void }) {
  const { categories } = useCategories()
  const { wallets } = useWallets()
  const { profile } = useProfile()
  const refresh = useRefresh()
  const [amount, setAmount] = useState(t.amount)
  const [place, setPlace] = useState(t.place ?? '')
  const [date, setDate] = useState(t.date)
  const [categoryId, setCategoryId] = useState<string | null>(t.categoryId)
  const [walletId, setWalletId] = useState<string | null>(t.walletId ?? profile?.defaultWalletId ?? null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const card = typeof t.sourceData?.card === 'string' ? t.sourceData.card : null

  async function run(fn: () => Promise<void>) {
    setBusy(true); setError(null)
    try { await fn(); await refresh(); onDone() }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível salvar.') }
    finally { setBusy(false) }
  }

  function confirm() {
    if (amount <= 0) { setError('Informe o valor.'); return }
    if (!walletId) { setError('Escolha a carteira.'); return }
    run(async () => {
      await transactionsApi.confirmPending(t.id, { amount, place: place.trim() || null, date, categoryId, walletId })
      if (card) await automationsApi.rememberCard(t.owner, card, walletId)
    })
  }

  return (
    <div className="space-y-6">
      <CurrencyInput id="pending-amount" aria-label="Valor" variant="display" value={amount} onChange={setAmount} />
      <ListGroup>
        <FormRow label="Onde foi?" htmlFor="pending-place">
          <Input id="pending-place" variant="bare" value={place} onChange={e => setPlace(e.target.value)} placeholder="Opcional" className="text-right" />
        </FormRow>
        <FormRow label="Data" htmlFor="pending-date">
          <DateField id="pending-date" value={date} onChange={v => setDate(v || todayIso())} />
        </FormRow>
      </ListGroup>
      <ListGroup header="Categoria">
        <li className="flex flex-wrap gap-2 p-3">
          {categories.filter(c => c.type === 'expense').map(c => (
            <ChoiceChip key={c.id} selected={categoryId === c.id} onClick={() => setCategoryId(categoryId === c.id ? null : c.id)} className="pl-1">
              <TokenIcon active={categoryId === c.id} icon={c.icon} color={c.color} size="sm" />{c.name}
            </ChoiceChip>
          ))}
        </li>
      </ListGroup>
      <ListGroup header="Como pagou?" footer={card ? `Apple Pay: ${card}` : undefined}>
        <WalletPicker wallets={wallets} value={walletId} onChange={setWalletId} />
      </ListGroup>
      {error && <p className="px-4 text-footnote text-destructive">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" size="lg" disabled={busy}
          onClick={() => { if (window.confirm('Descartar este gasto?')) run(() => transactionsApi.remove(t.id)) }}>
          Descartar
        </Button>
        <Button size="lg" disabled={busy} onClick={confirm}>Confirmar</Button>
      </div>
    </div>
  )
}
