'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormRow } from '@/components/ios/form-row'
import { ListGroup } from '@/components/ios/list-group'
import { ModalSheet } from '@/components/ios/modal-sheet'
import { ChoiceChip } from '@/components/shared/choice-chip'
import { CurrencyInput } from '@/components/shared/currency-input'
import { NumberField } from '@/components/shared/number-field'
import { useProfile } from '@/hooks/use-profile'
import { useRefresh } from '@/hooks/use-refresh'
import { profileApi } from '@/lib/api/profile'
import { walletsApi } from '@/lib/api/wallets'
import { WALLET_FINISHES, WALLET_TYPES } from '@/lib/constants'
import type { OwnWallet, WalletType } from '@/lib/types'
import { CardPreview } from './card-preview'

// CAR-3, CAR-4, CAR-7: criar, editar, arquivar e excluir carteira.
export function WalletFormSheet({
  open, wallet, onClose,
}: { open: boolean; wallet: OwnWallet | null; onClose: () => void }) {
  return (
    <ModalSheet open={open} onOpenChange={o => { if (!o) onClose() }}
      title={wallet ? 'Editar carteira' : 'Nova carteira'} formId="wallet" actionLabel="Salvar">
      {open && <Form key={wallet?.id ?? 'new'} wallet={wallet} onDone={onClose} />}
    </ModalSheet>
  )
}

function Form({ wallet, onDone }: { wallet: OwnWallet | null; onDone: () => void }) {
  const refresh = useRefresh()
  const { profile } = useProfile()
  const [name, setName] = useState(wallet?.name ?? '')
  const [type, setType] = useState<WalletType>(wallet?.type ?? 'credit')
  const [finish, setFinish] = useState(wallet?.finish ?? 'black')
  const [closingDay, setClosingDay] = useState(wallet?.closingDay ?? 5)
  const [dueDay, setDueDay] = useState(wallet?.dueDay ?? 12)
  const [limit, setLimit] = useState(wallet?.spendingLimit ?? 0)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const isCredit = type === 'credit'
  const typeLabel = WALLET_TYPES.find(t => t.value === type)?.label
  const isDefault = !!wallet && profile?.defaultWalletId === wallet.id

  async function run(fn: () => Promise<unknown>) {
    setBusy(true); setError(null)
    try { await fn(); await refresh(); onDone() }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível concluir.') }
    finally { setBusy(false) }
  }

  function save(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Dê um nome para a carteira.'); return }
    const input = {
      name: name.trim(), type, finish,
      closingDay: isCredit ? closingDay : null,
      dueDay: isCredit ? dueDay : null,
      spendingLimit: isCredit && limit > 0 ? limit : null,
    }
    run(() => (wallet ? walletsApi.update(wallet.id, input) : walletsApi.create(input)))
  }

  return (
    <form id="wallet" onSubmit={save} className="space-y-6">
      <div className="flex justify-center">
        <CardPreview name={name} finish={finish} typeLabel={typeLabel}
          subtitle={isCredit ? `Fecha dia ${closingDay} · vence dia ${dueDay}` : undefined} />
      </div>

      <ListGroup>
        <FormRow label="Nome" htmlFor="w-name">
          <Input id="w-name" variant="bare" value={name} onChange={e => setName(e.target.value)} placeholder="Nubank, Itaú…" className="text-right" />
        </FormRow>
      </ListGroup>

      <ListGroup header="Tipo">
        <li className="flex flex-wrap gap-2 p-3">
          {WALLET_TYPES.map(t => (
            <ChoiceChip key={t.value} selected={type === t.value} onClick={() => setType(t.value)}
              disabled={!!wallet && wallet.type !== t.value && (wallet.type === 'credit' || t.value === 'credit')}>
              {t.label}
            </ChoiceChip>
          ))}
        </li>
      </ListGroup>

      {isCredit && (
        <ListGroup footer="O fechamento define em qual fatura cada compra entra.">
          <FormRow label="Dia do fechamento" htmlFor="w-closing">
            <NumberField id="w-closing" min={1} max={31} value={closingDay} onChange={setClosingDay} className="w-16 text-right" />
          </FormRow>
          <FormRow label="Dia do vencimento" htmlFor="w-due">
            <NumberField id="w-due" min={1} max={31} value={dueDay} onChange={setDueDay} className="w-16 text-right" />
          </FormRow>
          <FormRow label="Limite de gasto" htmlFor="w-limit">
            <CurrencyInput id="w-limit" variant="bare" value={limit} onChange={setLimit} placeholder="Opcional" className="text-right" />
          </FormRow>
        </ListGroup>
      )}

      <ListGroup header="Acabamento">
        <li className="flex flex-wrap gap-2 p-3">
          {WALLET_FINISHES.map(f => (
            <ChoiceChip key={f.value} selected={finish === f.value} onClick={() => setFinish(f.value)} className="pl-1.5">
              <CardPreview name="" finish={f.value} size="sm" className="w-7" />
              {f.label}
            </ChoiceChip>
          ))}
        </li>
      </ListGroup>

      {error && <p className="px-4 text-footnote text-destructive">{error}</p>}

      {wallet && (
        <div className="space-y-2">
          {!isDefault && wallet.active && !isCredit && (
            <Button type="button" variant="secondary" size="lg" className="w-full" disabled={busy}
              onClick={() => run(() => profileApi.update(profile!.id, { default_wallet_id: wallet.id }))}>
              Usar como carteira padrão
            </Button>
          )}
          <Button type="button" variant="secondary" size="lg" className="w-full" disabled={busy}
            onClick={() => run(() => walletsApi.setActive(wallet.id, !wallet.active))}>
            {wallet.active ? 'Arquivar' : 'Reativar'}
          </Button>
          <Button type="button" variant="ghost" size="lg" className="w-full text-destructive" disabled={busy}
            onClick={() => { if (confirm('Excluir esta carteira?')) run(() => walletsApi.remove(wallet.id)) }}>
            Excluir
          </Button>
        </div>
      )}
    </form>
  )
}
