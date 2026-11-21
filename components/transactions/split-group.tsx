'use client'

import { Switch } from '@/components/ui/switch'
import { FormRow } from '@/components/ios/form-row'
import { SegmentedControl } from '@/components/ios/segmented-control'
import { MemberAvatar } from '@/components/family/member-avatar'
import { ChoiceChip } from '@/components/shared/choice-chip'
import { CurrencyInput } from '@/components/shared/currency-input'
import type { ReceiptItem } from '@/lib/receipt'
import { SPLIT_ALL, splitParts, type SplitMode } from '@/lib/split'
import type { FamilyMember } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'

export interface SplitValue {
  on: boolean
  // ids de quem está na divisão
  selected: string[]
  mode: SplitMode
  // por valor: valor fixo de cada pessoa (0 = divide o resto igual)
  values: Record<string, number>
}

export const splitDefault = (): SplitValue => ({ on: false, selected: [], mode: 'item', values: {} })

// "Por item" só existe com itens; sem itens, vale "Igual"
export const splitMode = (value: SplitValue, items: ReceiptItem[]): SplitMode =>
  value.mode === 'item' && !items.length ? 'equal' : value.mode

// pessoas da divisão na ordem das pessoas do cartão, com quem divide primeiro
export function splitPeople(value: SplitValue, people: FamilyMember[], me: string) {
  const ids = people.map(p => p.userId).filter(id => id === me || value.selected.includes(id))
  return [me, ...ids.filter(id => id !== me)]
}

// Texto do rodapé: quanto fica para cada pessoa, ou o motivo de não fechar.
export function splitSummary(value: SplitValue, people: FamilyMember[], me: string, items: ReceiptItem[], total: number) {
  const ids = splitPeople(value, people, me)
  const { parts, error } = splitParts({ mode: splitMode(value, items), total, people: ids, items, values: value.values })
  const name = (id: string) => (id === me ? 'Você' : people.find(p => p.userId === id)?.name ?? 'Pessoa')
  return error ?? parts.map(p => `${name(p.userId)} ${formatCurrency(p.amount)}`).join(' · ')
}

// Opções de dono de item na divisão por item: cada pessoa da divisão ou "Dividir" (entre todos).
export function itemOwnerOptions(value: SplitValue, people: FamilyMember[], me: string) {
  const name = (id: string) => (id === me ? 'Você' : people.find(p => p.userId === id)?.name ?? 'Pessoa')
  return [...splitPeople(value, people, me).map(id => ({ value: id, label: name(id) })), { value: SPLIT_ALL, label: 'Dividir' }]
}

// Dividir a compra no cartão (registro de gasto), em linhas dentro do grupo do pagamento: o switch, as pessoas e
// como dividir. Por item, o dono de cada item é escolhido na própria lista de itens (ItemsEditor owners);
// por valor, quem fica em branco divide o resto igual.
export function SplitRows({ value, onChange, people, me, items, total }: {
  value: SplitValue
  onChange: (v: SplitValue) => void
  people: FamilyMember[]
  me: string
  items: ReceiptItem[]
  total: number
}) {
  const set = (patch: Partial<SplitValue>) => onChange({ ...value, ...patch })
  const ids = splitPeople(value, people, me)
  const mode = splitMode(value, items)
  const { parts } = splitParts({ mode, total, people: ids, items, values: value.values })
  const name = (id: string) => (id === me ? 'Você' : people.find(p => p.userId === id)?.name ?? 'Pessoa')

  function toggleOn(on: boolean) {
    // com só uma outra pessoa no cartão, ela já entra marcada
    const others = people.filter(p => p.userId !== me)
    onChange({ ...value, on, selected: on && !value.selected.length && others.length === 1 ? [others[0].userId] : value.selected })
  }

  function toggle(id: string) {
    set({ selected: value.selected.includes(id) ? value.selected.filter(x => x !== id) : [...value.selected, id] })
  }

  return (
    <>
      <FormRow label="Dividir compra">
        <Switch checked={value.on} onCheckedChange={toggleOn} />
      </FormRow>
      {value.on && (
        <>
          <li className="flex flex-wrap gap-2 border-b border-separator p-3">
            {people.filter(p => p.userId !== me).map(p => (
              <ChoiceChip key={p.userId} selected={value.selected.includes(p.userId)} onClick={() => toggle(p.userId)} className="pl-1">
                <MemberAvatar name={p.name} color={p.avatarColor} size="sm" />{p.name}
              </ChoiceChip>
            ))}
          </li>
          <li className="border-b border-separator p-3 last:border-b-0">
            <SegmentedControl<SplitMode> aria-label="Como dividir" value={mode} onChange={m => set({ mode: m })}
              options={[
                ...(items.length ? [{ value: 'item' as const, label: 'Por item' }] : []),
                { value: 'equal', label: 'Igual' },
                { value: 'value', label: 'Por valor' },
              ]} />
          </li>
          {mode === 'value' && ids.map(id => (
            <FormRow key={id} label={name(id)} htmlFor={`split-value-${id}`}>
              <CurrencyInput id={`split-value-${id}`} variant="bare" value={value.values[id] ?? 0}
                onChange={v => set({ values: { ...value.values, [id]: v } })}
                placeholder={formatCurrency(parts.find(p => p.userId === id)?.amount ?? 0)} className="text-right" />
            </FormRow>
          ))}
        </>
      )}
    </>
  )
}
