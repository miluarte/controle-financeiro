'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

type Mode = 'signin' | 'signup'

export function AuthForm() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
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
          options: { emailRedirectTo: window.location.origin },
        })
        if (error) throw error
        if (!data.session) {
          setInfo('Conta criada. Confirme pelo link enviado ao seu e-mail e depois entre aqui.')
          setMode('signin')
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao entrar'
      setError(message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg">Troco</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Tabs value={mode} onValueChange={v => setMode(v as Mode)}>
              <TabsList className="w-full">
                <TabsTrigger value="signin" className="flex-1">Entrar</TabsTrigger>
                <TabsTrigger value="signup" className="flex-1">Criar conta</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {info && <p className="text-sm text-muted-foreground">{info}</p>}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Aguarde...' : mode === 'signin' ? 'Entrar' : 'Criar conta'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
