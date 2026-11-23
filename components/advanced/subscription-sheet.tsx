'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { FormRow } from '@/components/ios/form-row'
import { ListGroup } from '@/components/ios/list-group'
import { ModalSheet } from '@/components/ios/modal-sheet'
import { useDeleteAction } from '@/components/ios/use-delete-action'
import { CurrencyInput } from '@/components/shared/currency-input'
import { useRefresh } from '@/hooks/use-refresh'
import { subscriptionsApi } from '@/lib/api/advanced'
import type { Subscription } from '@/lib/types'
import { UseCalendar } from './use-calendar'
import { feedback } from '@/lib/feedback'
import posthog from 'posthog-js'

// Criar ou editar uma assinatura e marcar os dias de uso do mês.
export function SubscriptionSheet({ open, subscription, month, usedDays, onOpenChange }: {
  open: boolean; subscription: Subscription | null; month: string; usedDays: string[]; onOpenChange: (o: boolean) => void
}) {
  const del = useDeleteAction({ title: 'Excluir assinatura?', remove: () => subscriptionsApi.remove(subscription!.id), onDone: () => onOpenChange(false) })
  return (
    <>
    {del.sheet}
    <ModalSheet open={open} onOpenChange={onOpenChange} title={subscription?.name ?? 'Nova assinatura'} formId="sub-form" actionLabel="Salvar"
      onDelete={subscription ? del.ask : undefined}>
      {open && (
        <SubscriptionForm key={subscription?.id ?? 'new'} subscription={subscription} month={month}
          usedDays={usedDays} onDone={() => onOpenChange(false)} />
      )}
    </ModalSheet>
    </>
  )
}

function SubscriptionForm({ subscription, month, usedDays, onDone }: {
  subscription: Subscription | null; month: string; usedDays: string[]; onDone: () => void
}) {
  const refresh = useRefresh()
  const [name, setName] = useState(subscription?.name ?? '')
  const [monthly, setMonthly] = useState(subscription?.monthlyAmount ?? 0)
  const [unit, setUnit] = useState(subscription?.unitPrice ?? 0)
  const [error, setError] = useState<string | null>(null)

  // done: aviso depois da ação (salvar fecha a folha e avisa "Salvo")
  async function run(fn: () => Promise<void>, close = true, done = close ? 'Salvo' : undefined, captureSave = false) {
    setError(null)
    try {
      await fn(); await refresh()
      if (captureSave) posthog.capture('subscription_saved', { action: subscription ? 'updated' : 'created', has_unit_price: unit > 0 })
      if (close) onDone(); if (done) feedback.done(done)
    }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível salvar.') }
  }

  function save(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Dê um nome.'); return }
    if (monthly <= 0) { setError('Informe o valor mensal.'); return }
    const input = { name: name.trim(), monthlyAmount: monthly, unitPrice: unit > 0 ? unit : null, active: true }
    run(() => subscription ? subscriptionsApi.update(subscription.id, input) : subscriptionsApi.create(input), true, undefined, true)
  }

  return (
    <form id="sub-form" onSubmit={save} className="space-y-6">
      <ListGroup>
        <FormRow label="Nome" htmlFor="sub-name">
          <Input id="sub-name" variant="bare" value={name} onChange={e => setName(e.target.value)} placeholder="Academia, streaming…" className="text-right" />
        </FormRow>
        <FormRow label="Por mês" htmlFor="sub-monthly">
          <CurrencyInput id="sub-monthly" variant="bare" value={monthly} onChange={setMonthly} className="text-right" />
        </FormRow>
        <FormRow label="Avulso, por uso" htmlFor="sub-unit">
          <CurrencyInput id="sub-unit" variant="bare" value={unit} onChange={setUnit} placeholder="Opcional" className="text-right" />
        </FormRow>
      </ListGroup>

      {subscription && (
        <ListGroup header="Dias de uso">
          <li>
            <UseCalendar month={month} used={new Set(usedDays)}
              onToggle={(d, used) => run(() => subscriptionsApi.toggleUse(subscription.id, d, used), false)} />
          </li>
        </ListGroup>
      )}

      {error && <p className="px-4 text-footnote text-destructive">{error}</p>}
    </form>
  )
}
