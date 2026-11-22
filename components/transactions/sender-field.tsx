'use client'

import { Input } from '@/components/ui/input'
import { FormRow } from '@/components/ios/form-row'
import { SelectField } from '@/components/shared/select-field'
import type { FamilyMember } from '@/lib/types'

// Quem enviou o dinheiro (receita, ex.: Pix recebido): alguém da família no app ou outro nome digitado.
// Opcional; fica em source_data.sender.
export interface Sender { userId: string | null; name: string }

const OTHER = '__outra'

export const senderOf = (data: Record<string, unknown> | null | undefined): Sender | null => {
  const s = data?.sender as { user_id?: string | null; name?: string } | undefined
  return s?.name ? { userId: s.user_id ?? null, name: s.name } : null
}
export const senderData = (s: Sender | null) =>
  s && s.name.trim() ? { sender: { user_id: s.userId, name: s.name.trim() } } : {}

export function SenderRows({ id, value, onChange, people, me, disabled }: {
  id: string
  value: Sender | null
  onChange: (s: Sender | null) => void
  people: FamilyMember[]
  me: string
  disabled?: boolean
}) {
  const others = people.filter(p => p.userId !== me)
  // "Outra pessoa" escolhida, ainda sem nome digitado, também mostra o campo de texto
  const typing = !!value && !value.userId
  const selected = !value ? '' : value.userId ?? OTHER

  function pick(v: string) {
    if (!v) return onChange(null)
    if (v === OTHER) return onChange({ userId: null, name: value && !value.userId ? value.name : '' })
    const p = others.find(x => x.userId === v)
    onChange({ userId: v, name: p?.name ?? '' })
  }

  return (
    <>
      <FormRow label="Remetente" htmlFor={id}>
        <SelectField id={id} value={selected} onChange={pick} placeholder="Opcional"
          options={[...others.map(p => ({ value: p.userId, label: p.name })), { value: OTHER, label: 'Outra pessoa' }]} />
      </FormRow>
      {typing && (
        <FormRow label="Nome" htmlFor={`${id}-name`}>
          <Input id={`${id}-name`} variant="bare" value={value!.name} disabled={disabled} autoFocus
            onChange={e => onChange({ userId: null, name: e.target.value })} placeholder="Ex.: Ana" className="text-right" />
        </FormRow>
      )}
    </>
  )
}
