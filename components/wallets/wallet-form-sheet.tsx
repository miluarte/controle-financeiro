'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormRow } from '@/components/ios/form-row'
import { ListGroup } from '@/components/ios/list-group'
import { ModalSheet } from '@/components/ios/modal-sheet'
import { useDeleteAction } from '@/components/ios/use-delete-action'
import { ChoiceChip } from '@/components/shared/choice-chip'
import { CurrencyInput } from '@/components/shared/currency-input'
import { DecimalField } from '@/components/shared/decimal-field'
import { NumberField } from '@/components/shared/number-field'
import { SelectField } from '@/components/shared/select-field'
import { useInstitutions } from '@/hooks/use-data'
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
  const del = useDeleteAction({ title: 'Excluir esta carteira?', remove: () => walletsApi.remove(wallet!.id), onDone: onClose })
  return (
    <>
    {del.sheet}
    <ModalSheet open={open} onOpenChange={o => { if (!o) onClose() }}
      title={wallet ? 'Editar carteira' : 'Nova carteira'} formId="wallet" actionLabel="Salvar"
      onDelete={wallet ? del.ask : undefined}>
      {open && <Form key={wallet?.id ?? 'new'} wallet={wallet} onDone={onClose} />}
    </ModalSheet>
    </>
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
  const institutions = useInstitutions()
  const [institutionId, setInstitutionId] = useState(wallet?.institutionId ?? '')
  const [last4, setLast4] = useState(wallet?.last4 ?? '')
  const [revolving, setRevolving] = useState(wallet?.revolvingRate ?? 0)
  // novo cartão com as duas funções vira duas carteiras: crédito (com fatura) e débito (sai na hora)
  const [both, setBoth] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const isCredit = type === 'credit'
  // num cartão novo, Crédito e Débito podem ser marcados juntos (cria as duas carteiras)
  const isCardType = (t: WalletType) => t === 'credit' || t === 'debit'
  const isSelected = (t: WalletType) => (both ? isCardType(t) : type === t)
  function pickType(t: WalletType) {
    if (!wallet && isCardType(t)) {
      if (both) { setBoth(false); setType(t === 'credit' ? 'debit' : 'credit'); return }
      if (isCardType(type) && type !== t) { setBoth(true); setType('credit'); return }
    }
    setBoth(false); setType(t)
  }
  const isCard = type === 'credit' || type === 'debit'
  const institution = institutions.find(i => i.id === institutionId)
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
    const finalName = name.trim() || institution?.name || ''
    if (!finalName) { setError('Dê um nome para a carteira.'); return }
    if (last4 && !/^\d{4}$/.test(last4)) { setError('O final do cartão tem 4 números.'); return }
    const card = {
      institutionId: isCard ? institutionId || null : null,
      last4: isCard ? last4 || null : null,
    }
    const input = {
      name: finalName, type, finish, ...card,
      closingDay: isCredit ? closingDay : null,
      dueDay: isCredit ? dueDay : null,
      spendingLimit: isCredit && limit > 0 ? limit : null,
      revolvingRate: isCredit && revolving > 0 ? revolving : null,
    }
    run(async () => {
      if (wallet) { await walletsApi.update(wallet.id, input); return }
      await walletsApi.create(input)
      if (both && isCredit) {
        await walletsApi.create({ ...card, name: finalName, type: 'debit', finish, closingDay: null, dueDay: null, spendingLimit: null, revolvingRate: null })
      }
    })
  }

  return (
    <form id="wallet" onSubmit={save} className="space-y-6">
      <div className="flex justify-center">
        <CardPreview name={name || institution?.name || ''} finish={finish} typeLabel={both && isCredit ? 'Crédito e débito' : typeLabel}
          subtitle={[last4 && `•••• ${last4}`, isCredit && `Fecha dia ${closingDay} · vence dia ${dueDay}`].filter(Boolean).join(' · ') || undefined} />
      </div>

      <ListGroup>
        <FormRow label="Nome" htmlFor="w-name">
          <Input id="w-name" variant="bare" value={name} onChange={e => setName(e.target.value)} placeholder={institution?.name ?? 'Nubank, Itaú…'} className="text-right" />
        </FormRow>
        {isCard && (
          <>
            <FormRow label="Banco" htmlFor="w-inst">
              <SelectField id="w-inst" value={institutionId} onChange={setInstitutionId}
                options={institutions.map(i => ({ value: i.id, label: i.name }))} />
            </FormRow>
            <FormRow label="Final do cartão" htmlFor="w-last4">
              <Input id="w-last4" variant="bare" inputMode="numeric" maxLength={4} placeholder="0000" value={last4}
                onChange={e => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))} className="w-20 text-right" />
            </FormRow>
          </>
        )}
      </ListGroup>

      <ListGroup header="Tipo">
        <li className="flex flex-wrap gap-2 p-3">
          {WALLET_TYPES.map(t => (
            <ChoiceChip key={t.value} selected={isSelected(t.value)} onClick={() => pickType(t.value)}
              disabled={!!wallet && wallet.type !== t.value && (wallet.type === 'credit' || t.value === 'credit')}>
              {t.label}
            </ChoiceChip>
          ))}
        </li>
      </ListGroup>

      {isCredit && (
        <ListGroup >
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

      {isCredit && (
        <ListGroup header="Juros do rotativo (% ao mês)" footer="Está na fatura, em Pagamento em atraso. Usado para estimar o atraso.">
          <FormRow label="Juros do rotativo" htmlFor="w-rate">
            <DecimalField id="w-rate" decimals={2} value={revolving || institution?.revolvingRate || 0} onChange={setRevolving} className="w-20 text-right" />
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
        </div>
      )}
    </form>
  )
}
