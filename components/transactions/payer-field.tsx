'use client'

import { FormRow } from '@/components/ios/form-row'
import { SelectField } from '@/components/shared/select-field'
import type { FamilyMember } from '@/lib/types'

// Pix dividido: quem pagou o Pix (você ou alguém da família). O dinheiro sai do saldo de quem pagou.
export function PayerRow({ id, value, onChange, people, me }: {
  id: string
  value: string
  onChange: (userId: string) => void
  people: FamilyMember[]
  me: string
}) {
  const options = [{ value: me, label: 'Você' }, ...people.filter(p => p.userId !== me).map(p => ({ value: p.userId, label: p.name }))]
  return (
    <FormRow label="Quem pagou" htmlFor={id}>
      <SelectField id={id} value={value || me} onChange={v => onChange(v || me)} options={options} />
    </FormRow>
  )
}
