'use client'

import { useSession } from '@/hooks/use-session'
import { AuthForm } from './auth-form'

// Sem sessão, mostra a tela de login no lugar do app. Os dados de cada usuário
// são isolados no banco (RLS), então isto é só a porta de entrada da interface.
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession()

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  if (!session) return <AuthForm />

  return <>{children}</>
}
