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
import { COLOR_TOKENS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { feedback } from '@/lib/feedback'
import { FormError } from '@/components/shared/form-error'
import { MemberAvatar } from '@/components/family/member-avatar'
import { ProfilePhotoField, type PhotoChange } from '@/components/profile/profile-photo-field'

// ACE-2: avatar com a inicial, nome e e-mail. Toque abre a edição.
export function ProfileCard() {
  const { profile } = useProfile()
  const { session } = useSession()
  const [editing, setEditing] = useState(false)
  const name = profile?.name || ''
  const [cropping, setCropping] = useState(false)
  const [saving, setSaving] = useState(false)

  return (
    <>
      <ListGroup>
        <ListRow className="py-1" onClick={() => setEditing(true)} chevron
          leading={<MemberAvatar name={name || session?.user.email || '?'} color={profile?.avatarColor ?? 'gray'} src={profile?.avatarUrl} size="lg" />}
          title={<span className="text-title3 font-semibold">{name || 'Sem nome'}</span>}
          subtitle={session?.user.email} />
      </ListGroup>
      <ModalSheet open={editing} onOpenChange={o => { setEditing(o); if (!o) setCropping(false) }}
        title={cropping ? 'Ajustar foto' : 'Perfil'} formId={cropping ? undefined : 'profile'} actionLabel="Salvar" actionDisabled={saving}>
        {editing && profile && <ProfileForm onDone={() => setEditing(false)} onCroppingChange={setCropping} onSavingChange={setSaving} />}
      </ModalSheet>
    </>
  )
}

function ProfileForm({ onDone, onCroppingChange, onSavingChange }: {
  onDone: () => void
  onCroppingChange: (cropping: boolean) => void
  onSavingChange: (saving: boolean) => void
}) {
  const { profile } = useProfile()
  const refresh = useRefresh()
  const [name, setName] = useState(profile!.name)
  const [color, setColor] = useState(profile!.avatarColor)
  const [photo, setPhoto] = useState<PhotoChange>(null)
  const [cropping, setCropping] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function changeCropping(v: boolean) { setCropping(v); onCroppingChange(v) }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Informe seu nome.'); return }
    onSavingChange(true)
    try {
      await profileApi.update(profile!.id, { name: name.trim(), avatar_color: color })
      if (photo === 'remove') await profileApi.removePhoto(profile!.id)
      else if (photo) await profileApi.setPhoto(profile!.id, photo)
      await refresh(); onDone(); feedback.done('Salvo')
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível salvar.') }
    finally { onSavingChange(false) }
  }

  return (
    <form id="profile" onSubmit={save} className="space-y-6">
      <ProfilePhotoField name={name} color={color} current={profile!.avatarUrl} value={photo} onChange={setPhoto}
        cropping={cropping} onCroppingChange={changeCropping} />
      {!cropping && <>
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
      </>}
      <FormError message={error} />
    </form>
  )
}
