'use client'

import { useSession } from '@/hooks/use-session'
import { useProfile } from '@/hooks/use-profile'
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow'
import { AppLock } from './app-lock'
import { AuthForm } from './auth-form'

function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <p className="text-sm text-muted-foreground">Carregando…</p>
    </div>
  )
}

// Sem sessão, mostra a tela de login. Conta nova passa pelo onboarding antes do app.
// Os dados de cada usuário são isolados no banco (RLS); isto é só a porta de entrada da interface.
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession()
  const { profile, loading: profileLoading } = useProfile(!!session)

  if (loading) return <Loading />
  if (!session) return <AuthForm />
  if (profileLoading) return <Loading />
  // se o perfil não carregar (sem rede), segue para o app em vez de travar
  if (profile && !profile.onboardingCompletedAt) return <OnboardingFlow />

  return <AppLock key={session.user.id} userId={session.user.id}>{children}</AppLock>
}
