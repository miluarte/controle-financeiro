'use client'

import { Input } from '@/components/ui/input'
import { FormRow } from '@/components/ios/form-row'

export const MIN_PASSWORD = 6

// Nova senha e confirmação, usadas no link do e-mail e em Ajustes > Conta.
export function NewPasswordRows({ password, confirm, onPasswordChange, onConfirmChange }: {
  password: string
  confirm: string
  onPasswordChange: (v: string) => void
  onConfirmChange: (v: string) => void
}) {
  return (
    <>
      <FormRow label="Nova senha" htmlFor="new-password">
        <Input id="new-password" type="password" variant="bare" autoComplete="new-password" placeholder="Obrigatória"
          value={password} onChange={e => onPasswordChange(e.target.value)} className="text-right" />
      </FormRow>
      <FormRow label="Confirmar senha" htmlFor="confirm-password">
        <Input id="confirm-password" type="password" variant="bare" autoComplete="new-password" placeholder="Repita a senha"
          value={confirm} onChange={e => onConfirmChange(e.target.value)} className="text-right" />
      </FormRow>
    </>
  )
}

// Mensagem de erro antes de enviar, ou null se a senha serve.
export function checkNewPassword(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD) return `A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`
  if (password !== confirm) return 'As senhas não são iguais.'
  return null
}

// Erros do Supabase Auth em português.
export function authErrorPt(message: string): string {
  if (/should be different from the old password/i.test(message)) return 'A nova senha precisa ser diferente da atual.'
  if (/weak|at least/i.test(message)) return 'Senha fraca. Use uma senha maior, com letras e números.'
  if (/only request this after|rate limit/i.test(message)) return 'Muitas tentativas. Espere um minuto e tente de novo.'
  if (/session missing|expired|invalid/i.test(message)) return 'O link expirou. Peça um novo.'
  return message
}
