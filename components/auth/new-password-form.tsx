'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { feedback } from '@/lib/feedback'
import { useSession } from '@/hooks/use-session'
import { Button } from '@/components/ui/button'
import { ListGroup } from '@/components/ios/list-group'
import { AppLogo } from '@/components/shared/app-logo'
import { authErrorPt, checkNewPassword, MIN_PASSWORD, NewPasswordRows } from './new-password-rows'
import { FormError } from '@/components/shared/form-error'

// Aberto pelo link "Redefinir senha" do e-mail: a pessoa já está com sessão e escolhe a nova senha.
export function NewPasswordForm() {
  const { endRecovery } = useSession()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const invalid = checkNewPassword(password, confirm)
    if (invalid) { setError(invalid); return }
    setSaving(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (error) { setError(authErrorPt(error.message)); return }
    feedback.done('Senha salva')
    endRecovery()
  }

  async function cancel() {
    await supabase.auth.signOut()
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center px-4 lg:mx-auto lg:w-full lg:max-w-sm pt-safe-top pb-safe-bottom">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <AppLogo size="lg" />
        <h1 className="text-title1 font-bold">Nova senha</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <ListGroup footer={`Pelo menos ${MIN_PASSWORD} caracteres.`}>
          <NewPasswordRows password={password} confirm={confirm} onPasswordChange={setPassword} onConfirmChange={setConfirm} />
        </ListGroup>

        <FormError message={error} />

        <Button type="submit" size="lg" className="w-full" disabled={saving}>
          {saving ? 'Aguarde…' : 'Salvar'}
        </Button>
        <Button type="button" variant="plain" className="w-full" onClick={cancel}>Cancelar</Button>
      </form>
    </div>
  )
}
