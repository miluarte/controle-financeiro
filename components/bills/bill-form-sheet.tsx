'use client'

import { useState } from 'react'
import { CategoryField } from '@/components/shared/category-field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { FormRow } from '@/components/ios/form-row'
import { ListGroup } from '@/components/ios/list-group'
import { ModalSheet } from '@/components/ios/modal-sheet'
import { CurrencyInput } from '@/components/shared/currency-input'
import { NumberField } from '@/components/shared/number-field'
import { useCategories } from '@/hooks/use-categories'
import { useMonth } from '@/hooks/use-month'
import { useRefresh } from '@/hooks/use-refresh'
import { billsApi } from '@/lib/api/bills'
import { addMonths, capitalize, monthLabel } from '@/lib/utils'
import { RecurrenceEnd, type EndMode } from './recurrence-end'
import type { Bill, BillType } from '@/lib/types'
import { DateField } from '@/components/shared/date-field'
import { SelectField } from '@/components/shared/select-field'
import { useWallets } from '@/hooks/use-wallets'
import { feedback } from '@/lib/feedback'

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
  // cobrada no cartão de crédito (assinatura): entra sozinha na fatura todo mês
  const { wallets } = useWallets()
  const cards = wallets.filter(w => w.type === 'credit')
  const [cardId, setCardId] = useState(bill?.walletId ?? '')
  const [recurring, setRecurring] = useState(true)
  const [installments, setInstallments] = useState(false)
  const [current, setCurrent] = useState(1)
  const [total, setTotal] = useState(12)
  const [endMode, setEndMode] = useState<EndMode>(bill?.endMonth ? 'month' : 'never')
  const [endMonth, setEndMonth] = useState(bill?.endMonth?.slice(0, 7) ?? addMonths(month, 11))
  const [times, setTimes] = useState(12)
  const [error, setError] = useState<string | null>(null)

  // série que repete sem ser parcelada pode ter fim
  const base = bill ? bill.startMonth.slice(0, 7) : startMonth
  const repeats = bill ? bill.recurring && bill.installmentsTotal == null : recurring && !installments
  const lastMonth = installments
    ? addMonths(startMonth, total - current)
    : !repeats ? null
    : endMode === 'month' ? (endMonth < base ? base : endMonth)
    : endMode === 'times' ? addMonths(base, times - 1)
    : null
  const resolvedEnd = repeats && endMode !== 'never' && lastMonth ? `${lastMonth}-01` : null
  // mês do último pagamento/recebimento (vencimento no mês seguinte empurra um mês)
  const lastDue = lastMonth && (dueNextMonth && !income ? addMonths(lastMonth, 1) : lastMonth)
  const preview = lastDue
    ? `${income ? 'Último recebimento' : installments ? 'Última parcela' : 'Último pagamento'} em ${monthLabel(lastDue)}`
    : null

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError(income ? 'Dê um nome para a receita.' : 'Dê um nome para a conta.'); return }
    if (amount <= 0) { setError('Informe o valor.'); return }
    if (installments && (current < 1 || total < current)) { setError('Confira as parcelas.'); return }
    try {
      if (bill) {
        await billsApi.updateSeries(bill.id, month, { name: name.trim(), amount, dueDay, dueNextMonth: income || cardId ? false : dueNextMonth, categoryId, endMonth: resolvedEnd, walletId: income ? null : cardId || null })
        await refresh(); onDone(); feedback.done('Salvo')
        return
      }
      await billsApi.create({
        type, name: name.trim(), amount, dueDay, dueNextMonth: income || cardId ? false : dueNextMonth, categoryId,
        recurring: recurring || installments,
        startMonth: `${startMonth}-01`,
        installmentCurrent: installments ? current : null,
        installmentsTotal: installments ? total : null,
        endMonth: resolvedEnd,
        walletId: income ? null : cardId || null,
      })
      await refresh(); onDone(); feedback.done(income ? 'Receita adicionada' : 'Conta adicionada')
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
            <DateField id="bill-month" mode="month" value={startMonth} onChange={v => setStartMonth(v || month)} />
          </FormRow>
        )}
        {!income && cards.length > 0 && (
          <FormRow label="Cobrada no cartão" htmlFor="bill-card">
            <SelectField id="bill-card" value={cardId} onChange={setCardId} placeholder="Não"
              options={cards.map(w => ({ value: w.id, label: w.ownerName ? `${w.name}, de ${w.ownerName}` : w.name }))} />
          </FormRow>
        )}
        {!income && !cardId && (
          <FormRow label="Vence no mês seguinte">
            <Switch checked={dueNextMonth} onCheckedChange={setDueNextMonth} />
          </FormRow>
        )}
      </ListGroup>

      <ListGroup footer={cardId ? 'Entra sozinha na fatura todo mês.' : preview ? capitalize(preview) + '.' : bill ? 'Vale deste mês em diante.' : undefined}>
        {!bill && (
          <FormRow label="Repetir nos próximos meses">
            <Switch checked={recurring || installments} disabled={installments} onCheckedChange={setRecurring} />
          </FormRow>
        )}
        {!bill && !income && (
          <FormRow label="Parcelada">
            <Switch checked={installments} onCheckedChange={setInstallments} />
          </FormRow>
        )}
        {!bill && installments && (
          <>
            <FormRow label="Parcela atual" htmlFor="bill-current">
              <NumberField id="bill-current" min={1} max={360} value={current} onChange={setCurrent} className="w-16 text-right" />
            </FormRow>
            <FormRow label="Total de parcelas" htmlFor="bill-total">
              <NumberField id="bill-total" min={1} max={360} value={total} onChange={setTotal} className="w-16 text-right" />
            </FormRow>
          </>
        )}
        {repeats && (
          <RecurrenceEnd mode={endMode} onModeChange={setEndMode} endMonth={endMonth} onEndMonthChange={setEndMonth}
            minMonth={base} times={times} onTimesChange={setTimes} />
        )}
      </ListGroup>

      <ListGroup>
        <CategoryField id="bill-category" categories={categories.filter(c => c.type === type)} value={categoryId}
          onChange={setCategoryId} placeholder="Nenhuma" />
      </ListGroup>

      {error && <p className="px-4 text-footnote text-destructive">{error}</p>}
    </form>
  )
}
