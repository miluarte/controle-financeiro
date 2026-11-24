'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { feedback } from '@/lib/feedback'
import { ListGroup } from '@/components/ios/list-group'
import { ModalSheet } from '@/components/ios/modal-sheet'
import { authErrorPt, checkNewPassword, MIN_PASSWORD, NewPasswordRows } from '@/components/auth/new-password-rows'

// Ajustes > Conta > Trocar senha, com a sessão aberta.
export function ChangePasswordSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [saving, setSaving] = useState(false)
  return (
    <ModalSheet open={open} onOpenChange={onOpenChange} title="Trocar senha" formId="change-password" actionLabel="Salvar" actionDisabled={saving}>
      {open && <Form onSaving={setSaving} onDone={() => onOpenChange(false)} />}
    </ModalSheet>
  )
}

function Form({ onSaving, onDone }: { onSaving: (v: boolean) => void; onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const invalid = checkNewPassword(password, confirm)
    if (invalid) { setError(invalid); return }
    onSaving(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    onSaving(false)
    if (error) { setError(authErrorPt(error.message)); return }
    feedback.done('Senha salva')
    onDone()
  }

  return (
    <form id="change-password" onSubmit={handleSubmit} className="space-y-6">
      <ListGroup footer={error ?? `Pelo menos ${MIN_PASSWORD} caracteres.`}>
        <NewPasswordRows password={password} confirm={confirm} onPasswordChange={setPassword} onConfirmChange={setConfirm} />
      </ListGroup>
    </form>
  )
}
