'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { FormRow } from '@/components/ios/form-row'
import { ListGroup } from '@/components/ios/list-group'
import { ModalSheet } from '@/components/ios/modal-sheet'
import { ChoiceChip } from '@/components/shared/choice-chip'
import { CurrencyInput } from '@/components/shared/currency-input'
import { TokenIcon } from '@/components/shared/token-icon'
import { useCategories } from '@/hooks/use-categories'
import { useMonth } from '@/hooks/use-month'
import { useRefresh } from '@/hooks/use-refresh'
import { billsApi } from '@/lib/api/bills'

// CON-3, CON-4, CON-5: nova conta (fixa, recorrente ou parcelada).
export function BillFormSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <ModalSheet open={open} onOpenChange={onOpenChange} title="Nova conta" formId="new-bill" actionLabel="Salvar">
      {open && <BillForm onDone={() => onOpenChange(false)} />}
    </ModalSheet>
  )
}

function BillForm({ onDone }: { onDone: () => void }) {
  const { month } = useMonth()
  const { categories } = useCategories()
  const refresh = useRefresh()
  const [name, setName] = useState('')
  const [amount, setAmount] = useState(0)
  const [dueDay, setDueDay] = useState(10)
  const [startMonth, setStartMonth] = useState(month)
  const [dueNextMonth, setDueNextMonth] = useState(false)
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [recurring, setRecurring] = useState(true)
  const [installments, setInstallments] = useState(false)
  const [current, setCurrent] = useState(1)
  const [total, setTotal] = useState(12)
  const [error, setError] = useState<string | null>(null)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Dê um nome para a conta.'); return }
    if (amount <= 0) { setError('Informe o valor.'); return }
    if (installments && (current < 1 || total < current)) { setError('Confira as parcelas.'); return }
    try {
      await billsApi.create({
        name: name.trim(), amount, dueDay, dueNextMonth, categoryId,
        recurring: recurring || installments,
        startMonth: `${startMonth}-01`,
        installmentCurrent: installments ? current : null,
        installmentsTotal: installments ? total : null,
      })
      await refresh(); onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.')
    }
  }

  const clampDay = (v: string) => Math.min(31, Math.max(1, Number(v) || 1))

  return (
    <form id="new-bill" onSubmit={save} className="space-y-6">
      <CurrencyInput id="bill-amount" aria-label="Valor" variant="display" value={amount} onChange={setAmount} />
      <ListGroup>
        <FormRow label="Nome" htmlFor="bill-name">
          <Input id="bill-name" variant="bare" value={name} onChange={e => setName(e.target.value)} placeholder="Aluguel, internet…" className="text-right" />
        </FormRow>
        <FormRow label="Dia do vencimento" htmlFor="bill-day">
          <Input id="bill-day" type="number" inputMode="numeric" min={1} max={31} variant="bare"
            value={dueDay} onChange={e => setDueDay(clampDay(e.target.value))} className="w-16 text-right" />
        </FormRow>
        <FormRow label="Mês de referência" htmlFor="bill-month">
          <Input id="bill-month" type="month" variant="bare" value={startMonth}
            onChange={e => setStartMonth(e.target.value || month)} className="w-auto text-right" />
        </FormRow>
        <FormRow label="Vence no mês seguinte">
          <Switch checked={dueNextMonth} onCheckedChange={setDueNextMonth} />
        </FormRow>
      </ListGroup>

      <ListGroup footer="Repetindo, a conta aparece sozinha todo mês. Parcelada, a parcela avança a cada mês até o fim.">
        <FormRow label="Repetir nos próximos meses">
          <Switch checked={recurring || installments} disabled={installments} onCheckedChange={setRecurring} />
        </FormRow>
        <FormRow label="Parcelada">
          <Switch checked={installments} onCheckedChange={setInstallments} />
        </FormRow>
        {installments && (
          <>
            <FormRow label="Parcela atual" htmlFor="bill-current">
              <Input id="bill-current" type="number" inputMode="numeric" min={1} variant="bare"
                value={current} onChange={e => setCurrent(Math.max(1, Number(e.target.value) || 1))} className="w-16 text-right" />
            </FormRow>
            <FormRow label="Total de parcelas" htmlFor="bill-total">
              <Input id="bill-total" type="number" inputMode="numeric" min={1} variant="bare"
                value={total} onChange={e => setTotal(Math.max(1, Number(e.target.value) || 1))} className="w-16 text-right" />
            </FormRow>
          </>
        )}
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

      {error && <p className="px-4 text-footnote text-destructive">{error}</p>}
    </form>
  )
}
