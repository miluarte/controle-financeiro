'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { FormRow } from '@/components/ios/form-row'
import { ListGroup } from '@/components/ios/list-group'
import { ModalSheet } from '@/components/ios/modal-sheet'
import { ChoiceChip } from '@/components/shared/choice-chip'
import { CurrencyInput } from '@/components/shared/currency-input'
import { NumberField } from '@/components/shared/number-field'
import { TokenIcon } from '@/components/shared/token-icon'
import { useCategories } from '@/hooks/use-categories'
import { useMonth } from '@/hooks/use-month'
import { useRefresh } from '@/hooks/use-refresh'
import { billsApi } from '@/lib/api/bills'
import type { Bill, BillType } from '@/lib/types'

// CON-3, CON-4, CON-5: nova conta (fixa, recorrente ou parcelada).
// Com type="income" vira receita fixa (salário, aluguel recebido): mesma série mensal, mas a pagar vira a receber.
// Com bill, edita a série a partir do mês aberto (nome, valor, dia, categoria).
interface BillFormSheetProps {
  open: boolean
  onOpenChange: (o: boolean) => void
  type?: BillType
  bill?: Bill | null
}

export function BillFormSheet({ open, onOpenChange, type = 'expense', bill = null }: BillFormSheetProps) {
  const kind = bill?.type ?? type
  const title = bill ? (kind === 'income' ? 'Editar receita' : 'Editar conta') : kind === 'income' ? 'Nova receita fixa' : 'Nova conta'
  return (
    <ModalSheet open={open} onOpenChange={onOpenChange} title={title} formId="new-bill" actionLabel="Salvar">
      {open && <BillForm key={bill?.id ?? 'new'} type={kind} bill={bill} onDone={() => onOpenChange(false)} />}
    </ModalSheet>
  )
}

function BillForm({ type, bill, onDone }: { type: BillType; bill: Bill | null; onDone: () => void }) {
  const income = type === 'income'
  const { month } = useMonth()
  const { categories } = useCategories()
  const refresh = useRefresh()
  const [name, setName] = useState(bill?.name ?? '')
  const [amount, setAmount] = useState(bill?.amount ?? 0)
  const [dueDay, setDueDay] = useState(bill?.dueDay ?? 10)
  const [startMonth, setStartMonth] = useState(month)
  const [dueNextMonth, setDueNextMonth] = useState(bill?.dueNextMonth ?? false)
  const [categoryId, setCategoryId] = useState<string | null>(bill?.categoryId ?? null)
  const [recurring, setRecurring] = useState(true)
  const [installments, setInstallments] = useState(false)
  const [current, setCurrent] = useState(1)
  const [total, setTotal] = useState(12)
  const [error, setError] = useState<string | null>(null)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError(income ? 'Dê um nome para a receita.' : 'Dê um nome para a conta.'); return }
    if (amount <= 0) { setError('Informe o valor.'); return }
    if (installments && (current < 1 || total < current)) { setError('Confira as parcelas.'); return }
    try {
      if (bill) {
        await billsApi.updateSeries(bill.id, month, { name: name.trim(), amount, dueDay, dueNextMonth: income ? false : dueNextMonth, categoryId })
        await refresh(); onDone()
        return
      }
      await billsApi.create({
        type, name: name.trim(), amount, dueDay, dueNextMonth: income ? false : dueNextMonth, categoryId,
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

  return (
    <form id="new-bill" onSubmit={save} className="space-y-6">
      <CurrencyInput id="bill-amount" aria-label="Valor" variant="display" value={amount} onChange={setAmount} />
      <ListGroup>
        <FormRow label="Nome" htmlFor="bill-name">
          <Input id="bill-name" variant="bare" value={name} onChange={e => setName(e.target.value)} placeholder={income ? 'Salário, aluguel…' : 'Aluguel, internet…'} className="text-right" />
        </FormRow>
        <FormRow label={income ? 'Dia de receber' : 'Dia do vencimento'} htmlFor="bill-day">
          <NumberField id="bill-day" min={1} max={31} value={dueDay} onChange={setDueDay} className="w-16 text-right" />
        </FormRow>
        {!bill && (
          <FormRow label="Mês de referência" htmlFor="bill-month">
            <Input id="bill-month" type="month" variant="bare" value={startMonth}
              onChange={e => setStartMonth(e.target.value || month)} className="w-auto text-right" />
          </FormRow>
        )}
        {!income && (
          <FormRow label="Vence no mês seguinte">
            <Switch checked={dueNextMonth} onCheckedChange={setDueNextMonth} />
          </FormRow>
        )}
      </ListGroup>

      {bill ? (
        <p className="px-4 text-footnote text-muted-foreground">Vale deste mês em diante.</p>
      ) : (
      <ListGroup footer={income
        ? undefined
        : undefined}>
        <FormRow label="Repetir nos próximos meses">
          <Switch checked={recurring || installments} disabled={installments} onCheckedChange={setRecurring} />
        </FormRow>
        {!income && (
          <FormRow label="Parcelada">
            <Switch checked={installments} onCheckedChange={setInstallments} />
          </FormRow>
        )}
        {installments && (
          <>
            <FormRow label="Parcela atual" htmlFor="bill-current">
              <NumberField id="bill-current" min={1} max={360} value={current} onChange={setCurrent} className="w-16 text-right" />
            </FormRow>
            <FormRow label="Total de parcelas" htmlFor="bill-total">
              <NumberField id="bill-total" min={1} max={360} value={total} onChange={setTotal} className="w-16 text-right" />
            </FormRow>
          </>
        )}
      </ListGroup>
      )}

      <ListGroup header="Categoria">
        <li className="flex flex-wrap gap-2 p-3">
          {categories.filter(c => c.type === type).map(c => (
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
