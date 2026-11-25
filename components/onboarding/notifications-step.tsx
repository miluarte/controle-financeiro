'use client'

import { useEffect, useState } from 'react'
import { BellLinearIcon } from '@solar-icons/react'
import { Button } from '@/components/ui/button'
import { ListGroup } from '@/components/ios/list-group'
import { useSession } from '@/hooks/use-session'
import { enablePush, pushState, type PushState } from '@/lib/push'
import { OnboardingStep, StepIcon } from './onboarding-step'
import { FormError } from '@/components/shared/form-error'
import { Note } from '@/components/shared/note'

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
            <p>3. Abra o Troco pelo ícone e ative os avisos em Ajustes &gt; Notificações.</p>
          </li>
        </ListGroup>
      ) : state === 'on' ? (
        <p className="text-center text-body text-success">Avisos ativados neste aparelho.</p>
      ) : state === 'denied' ? (
        <Note size="subheadline">Os avisos estão bloqueados. Libere nos Ajustes do iPhone &gt; Notificações &gt; Troco.</Note>
      ) : state === 'off' ? (
        <Button size="lg" className="w-full" onClick={enable}>Ativar avisos</Button>
      ) : (
        <Note size="subheadline">Este navegador não recebe avisos. Você pode ativar depois em Ajustes.</Note>
      )}
      <FormError align="center" message={message} />
    </OnboardingStep>
  )
}
