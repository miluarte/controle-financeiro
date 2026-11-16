'use client'

import { useState } from 'react'
import { CardLinearIcon } from '@solar-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormRow } from '@/components/ios/form-row'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { ChoiceChip } from '@/components/shared/choice-chip'
import { NumberField } from '@/components/shared/number-field'
import { SelectField } from '@/components/shared/select-field'
import { CardPreview } from '@/components/wallets/card-preview'
import { useInstitutions, useOwnWallets } from '@/hooks/use-data'
import { useRefresh } from '@/hooks/use-refresh'
import { walletsApi } from '@/lib/api/wallets'
import { OnboardingStep, StepIcon } from './onboarding-step'

// Crédito e Débito são chips que podem ser marcados juntos (os dois cria as duas carteiras).
const KINDS = [{ value: 'credit', label: 'Crédito' }, { value: 'debit', label: 'Débito' }] as const

// Cartões: banco, final e função. O fechamento define em qual fatura cada compra entra.
export function CardsStep() {
  const { wallets } = useOwnWallets()
  const institutions = useInstitutions()
  const refresh = useRefresh()
  const [institutionId, setInstitutionId] = useState('')
  const [last4, setLast4] = useState('')
  const [kinds, setKinds] = useState<Set<'credit' | 'debit'>>(new Set(['credit']))
  const [closing, setClosing] = useState(5)
  const [due, setDue] = useState(12)
  const [error, setError] = useState<string | null>(null)
  const cards = wallets.filter(w => w.type === 'credit' || w.type === 'debit')
  const bank = institutions.find(i => i.id === institutionId)
  const hasCredit = kinds.has('credit')
  const toggle = (k: 'credit' | 'debit') => setKinds(prev => {
    const next = new Set(prev)
    if (next.has(k)) { if (next.size > 1) next.delete(k) } else next.add(k)
    return next
  })

  async function add() {
    if (!bank) { setError('Escolha o banco.'); return }
    setError(null)
    const base = { name: bank.name, finish: 'black', institutionId: bank.id, last4: last4 || null, spendingLimit: null, revolvingRate: null }
    try {
      if (hasCredit) await walletsApi.create({ ...base, type: 'credit', closingDay: closing, dueDay: due })
      if (kinds.has('debit')) await walletsApi.create({ ...base, type: 'debit', closingDay: null, dueDay: null })
      setInstitutionId(''); setLast4('')
      await refresh()
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível adicionar.') }
  }

  return (
    <OnboardingStep icon={<StepIcon><CardLinearIcon /></StepIcon>} title="Seus cartões"
      text="Pix e Dinheiro já estão prontos.">
      {cards.length > 0 && (
        <ListGroup header="Cadastrados">
          {cards.map(c => (
            <ListRow key={c.id} leading={<CardPreview name="" finish={c.finish} size="sm" className="w-11" />}
              title={`${c.name}${c.last4 ? ` •${c.last4}` : ''}`}
              subtitle={c.type === 'credit' ? `Crédito · fecha dia ${c.closingDay} · vence dia ${c.dueDay}` : 'Débito'} />
          ))}
        </ListGroup>
      )}
      <ListGroup header="Novo cartão" footer={error ?? 'Dá para mudar depois em Config.'}>
        <FormRow label="Banco" htmlFor="ob-bank">
          <SelectField id="ob-bank" value={institutionId} onChange={setInstitutionId}
            options={institutions.map(i => ({ value: i.id, label: i.name }))} />
        </FormRow>
        <FormRow label="Final do cartão" htmlFor="ob-last4">
          <Input id="ob-last4" variant="bare" inputMode="numeric" maxLength={4} placeholder="Opcional" value={last4}
            onChange={e => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))} className="w-24 text-right" />
        </FormRow>
        <li className="flex flex-wrap gap-2 p-3">
          {KINDS.map(k => (
            <ChoiceChip key={k.value} size="sm" selected={kinds.has(k.value)} onClick={() => toggle(k.value)}>{k.label}</ChoiceChip>
          ))}
        </li>
        {hasCredit && (
          <>
            <FormRow label="Dia do fechamento" htmlFor="ob-card-closing">
              <NumberField id="ob-card-closing" min={1} max={31} value={closing} onChange={setClosing} className="w-16 text-right" />
            </FormRow>
            <FormRow label="Dia do vencimento" htmlFor="ob-card-due">
              <NumberField id="ob-card-due" min={1} max={31} value={due} onChange={setDue} className="w-16 text-right" />
            </FormRow>
          </>
        )}
        <li className="p-3">
          <Button type="button" variant="secondary" className="w-full rounded-full" onClick={add} disabled={!bank}>
            Adicionar cartão
          </Button>
        </li>
      </ListGroup>
    </OnboardingStep>
  )
}
