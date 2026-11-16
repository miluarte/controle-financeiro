'use client'

import { useState } from 'react'
import { CardLinearIcon } from '@solar-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormRow } from '@/components/ios/form-row'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { NumberField } from '@/components/shared/number-field'
import { CardPreview } from '@/components/wallets/card-preview'
import { useOwnWallets } from '@/hooks/use-data'
import { useRefresh } from '@/hooks/use-refresh'
import { walletsApi } from '@/lib/api/wallets'
import { OnboardingStep, StepIcon } from './onboarding-step'

// Cartões de crédito: o fechamento define em qual fatura cada compra entra (CAR-4).
export function CardsStep() {
  const { wallets } = useOwnWallets()
  const refresh = useRefresh()
  const [name, setName] = useState('')
  const [closing, setClosing] = useState(5)
  const [due, setDue] = useState(12)
  const [error, setError] = useState<string | null>(null)
  const cards = wallets.filter(w => w.type === 'credit')

  async function add() {
    if (!name.trim()) { setError('Dê um nome para o cartão.'); return }
    setError(null)
    try {
      await walletsApi.create({ name: name.trim(), type: 'credit', finish: 'black', closingDay: closing, dueDay: due, spendingLimit: null })
      setName('')
      await refresh()
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível adicionar.') }
  }

  return (
    <OnboardingStep icon={<StepIcon><CardLinearIcon /></StepIcon>} title="Seus cartões"
      text="Cadastre seus cartões de crédito.">
      {cards.length > 0 && (
        <ListGroup header="Cadastrados">
          {cards.map(c => (
            <ListRow key={c.id} leading={<CardPreview name="" finish={c.finish} size="sm" className="w-11" />}
              title={c.name} subtitle={`Fecha dia ${c.closingDay} · vence dia ${c.dueDay}`} />
          ))}
        </ListGroup>
      )}
      <ListGroup header="Novo cartão" footer={error ?? 'Dá para mudar depois em Config.'}>
        <FormRow label="Nome" htmlFor="ob-card-name">
          <Input id="ob-card-name" variant="bare" value={name} onChange={e => setName(e.target.value)} placeholder="Nubank, Itaú…" className="text-right" />
        </FormRow>
        <FormRow label="Dia do fechamento" htmlFor="ob-card-closing">
          <NumberField id="ob-card-closing" min={1} max={31} value={closing} onChange={setClosing} className="w-16 text-right" />
        </FormRow>
        <FormRow label="Dia do vencimento" htmlFor="ob-card-due">
          <NumberField id="ob-card-due" min={1} max={31} value={due} onChange={setDue} className="w-16 text-right" />
        </FormRow>
        <li className="p-3">
          <Button type="button" variant="secondary" className="w-full rounded-full" onClick={add} disabled={!name.trim()}>
            Adicionar cartão
          </Button>
        </li>
      </ListGroup>
    </OnboardingStep>
  )
}
