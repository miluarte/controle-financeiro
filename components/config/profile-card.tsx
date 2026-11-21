'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { FormRow } from '@/components/ios/form-row'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { ModalSheet } from '@/components/ios/modal-sheet'
import { ChoiceChip } from '@/components/shared/choice-chip'
import { COLOR_CLASSES } from '@/components/shared/token-icon'
import { useProfile } from '@/hooks/use-profile'
import { useRefresh } from '@/hooks/use-refresh'
import { useSession } from '@/hooks/use-session'
import { profileApi } from '@/lib/api/profile'
import { COLOR_TOKENS, type ColorToken } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { feedback } from '@/lib/feedback'

function Avatar({ initial, color, large }: { initial: string; color: string; large?: boolean }) {
  return (
    <span className={cn(
      'flex items-center justify-center rounded-full font-semibold',
      large ? 'size-20 text-title1' : 'size-14 text-title2',
      COLOR_CLASSES[color as ColorToken] ?? COLOR_CLASSES.gray,
    )}>{initial}</span>
  )
}

// ACE-2: avatar com a inicial, nome e e-mail. Toque abre a edição.
export function ProfileCard() {
  const { profile } = useProfile()
  const { session } = useSession()
  const [editing, setEditing] = useState(false)
  const name = profile?.name || ''
  const initial = (name || session?.user.email || '?').charAt(0).toUpperCase()

  return (
    <>
      <ListGroup>
        <ListRow className="py-1" onClick={() => setEditing(true)} chevron
          leading={<Avatar initial={initial} color={profile?.avatarColor ?? 'gray'} />}
          title={<span className="text-title3 font-semibold">{name || 'Sem nome'}</span>}
          subtitle={session?.user.email} />
      </ListGroup>
      <ModalSheet open={editing} onOpenChange={setEditing} title="Perfil" formId="profile" actionLabel="Salvar">
        {editing && profile && <ProfileForm onDone={() => setEditing(false)} />}
      </ModalSheet>
    </>
  )
}

function ProfileForm({ onDone }: { onDone: () => void }) {
  const { profile } = useProfile()
  const refresh = useRefresh()
  const [name, setName] = useState(profile!.name)
  const [color, setColor] = useState(profile!.avatarColor)
  const [error, setError] = useState<string | null>(null)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Informe seu nome.'); return }
    try {
      await profileApi.update(profile!.id, { name: name.trim(), avatar_color: color })
      await refresh(); onDone(); feedback.done('Salvo')
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível salvar.') }
  }

  return (
    <form id="profile" onSubmit={save} className="space-y-6">
      <div className="flex justify-center"><Avatar initial={(name || '?').charAt(0).toUpperCase()} color={color} large /></div>
      <ListGroup>
        <FormRow label="Nome" htmlFor="p-name">
          <Input id="p-name" variant="bare" value={name} onChange={e => setName(e.target.value)} className="text-right" />
        </FormRow>
      </ListGroup>
      <ListGroup header="Cor do avatar">
        <li className="flex flex-wrap gap-2 p-3">
          {COLOR_TOKENS.map(k => (
            <ChoiceChip key={k} selected={color === k} onClick={() => setColor(k)} className="px-1" aria-label={k}>
              <span className={cn('size-7 rounded-full', COLOR_CLASSES[k])} />
            </ChoiceChip>
          ))}
        </li>
      </ListGroup>
      {error && <p className="px-4 text-footnote text-destructive">{error}</p>}
    </form>
  )
}
