'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormRow } from '@/components/ios/form-row'
import { ListGroup } from '@/components/ios/list-group'
import { SegmentedControl } from '@/components/ios/segmented-control'
import { AppLogo } from '@/components/shared/app-logo'
import { GoogleSignInButton } from './google-sign-in-button'

// Login com Google desligado por enquanto; o botão volta trocando para true.
const GOOGLE_LOGIN = false

type Mode = 'signin' | 'signup'

const ERROR_PT: Record<string, string> = {
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'Email not confirmed': 'Confirme seu e-mail pelo link que enviamos antes de entrar.',
  'User already registered': 'Já existe uma conta com este e-mail. Use Entrar.',
}

export function AuthForm() {
  const [mode, setMode] = useState<Mode>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    if (mode === 'signup' && !name.trim()) { setError('Informe seu nome.'); return }
    if (!email.trim()) { setError('Informe o e-mail.'); return }
    if (password.length < 6) { setError('A senha precisa ter pelo menos 6 caracteres.'); return }

    setSubmitting(true)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin, data: { name: name.trim() } },
        })
        if (error) throw error
        if (!data.session) {
          setInfo('Conta criada. Confirme pelo link enviado ao seu e-mail e depois entre aqui.')
          setMode('signin')
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao entrar'
      setError(ERROR_PT[message] ?? message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <AppLogo size="lg" />
        <div>
          <h1 className="text-large-title font-bold">Troco</h1>
          <p className="text-subheadline text-muted-foreground">Seu dinheiro, mês a mês.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <SegmentedControl
          aria-label="Entrar ou criar conta"
          value={mode}
          onChange={m => { setMode(m); setError(null); setInfo(null) }}
          options={[
            { value: 'signin', label: 'Entrar' },
            { value: 'signup', label: 'Criar conta' },
          ]}
        />

        <ListGroup footer={mode === 'signup' ? 'A senha precisa ter pelo menos 6 caracteres.' : undefined}>
          {mode === 'signup' && (
            <FormRow label="Nome" htmlFor="name">
              <Input id="name" variant="bare" autoComplete="given-name" placeholder="Seu nome"
                value={name} onChange={e => setName(e.target.value)} className="text-right" />
            </FormRow>
          )}
          <FormRow label="E-mail" htmlFor="email">
            <Input id="email" type="email" variant="bare" autoComplete="email" autoCapitalize="none" placeholder="voce@email.com"
              value={email} onChange={e => setEmail(e.target.value)} className="text-right" />
          </FormRow>
          <FormRow label="Senha" htmlFor="password">
            <Input id="password" type="password" variant="bare"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} placeholder="Obrigatória"
              value={password} onChange={e => setPassword(e.target.value)} className="text-right" />
          </FormRow>
        </ListGroup>

        {error && <p className="px-4 text-footnote text-destructive">{error}</p>}
        {info && <p className="px-4 text-footnote text-muted-foreground">{info}</p>}

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? 'Aguarde…' : mode === 'signin' ? 'Entrar' : 'Criar conta'}
        </Button>
      </form>

      {GOOGLE_LOGIN && (
        <>
          <div className="mt-6 flex items-center gap-3 text-footnote text-muted-foreground">
            <span className="h-px flex-1 bg-separator" />ou<span className="h-px flex-1 bg-separator" />
          </div>
          <div className="mt-6">
            <GoogleSignInButton onError={m => { setInfo(null); setError(m) }} />
          </div>
        </>
      )}
    </div>
  )
}
