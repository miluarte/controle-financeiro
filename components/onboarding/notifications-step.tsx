'use client'

import { useEffect, useState } from 'react'
import { BellLinearIcon } from '@solar-icons/react'
import { Button } from '@/components/ui/button'
import { ListGroup } from '@/components/ios/list-group'
import { useSession } from '@/hooks/use-session'
import { enablePush, pushState, type PushState } from '@/lib/push'
import { OnboardingStep, StepIcon } from './onboarding-step'

// Notificações: no iPhone só funcionam com o app na Tela de Início.
export function NotificationsStep() {
  const { session } = useSession()
  const [state, setState] = useState<PushState | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => { pushState().then(setState) }, [])

  async function enable() {
    setMessage(null)
    try { await enablePush(session!.user.id); setState(await pushState()) }
    catch (err) { setMessage(err instanceof Error ? err.message : 'Não foi possível ativar.') }
  }

  return (
    <OnboardingStep icon={<StepIcon><BellLinearIcon /></StepIcon>} title="Avisos"
      text="Contas a vencer, resumo da semana e família.">
      {state === 'needs-install' ? (
        <ListGroup header="Instale o Troco no iPhone">
          <li className="space-y-2 px-4 py-3 text-body">
            <p>1. No Safari, toque em Compartilhar.</p>
            <p>2. Escolha Adicionar à Tela de Início.</p>
            <p>3. Abra o Troco pelo ícone e ative os avisos em Config &gt; Notificações.</p>
          </li>
        </ListGroup>
      ) : state === 'on' ? (
        <p className="text-center text-body text-success">Avisos ativados neste aparelho.</p>
      ) : state === 'denied' ? (
        <p className="text-center text-subheadline text-muted-foreground">Os avisos estão bloqueados. Libere em Ajustes &gt; Notificações &gt; Troco.</p>
      ) : state === 'off' ? (
        <Button size="lg" className="w-full" onClick={enable}>Ativar avisos</Button>
      ) : (
        <p className="text-center text-subheadline text-muted-foreground">Este navegador não recebe avisos. Você pode ativar depois em Config.</p>
      )}
      {message && <p className="px-4 text-center text-footnote text-destructive">{message}</p>}
    </OnboardingStep>
  )
}
