'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { AutomationGuide } from '@/components/automations/automation-guide'
import { CopyRow } from '@/components/automations/copy-row'
import { LargeTitleHeader } from '@/components/ios/large-title-header'
import { ListGroup } from '@/components/ios/list-group'
import { AUTOMATION_URL, automationsApi } from '@/lib/api/automations'
import { formatDate } from '@/lib/utils'
import { feedback } from '@/lib/feedback'
import { useConfirmDelete } from '@/components/ios/use-delete-action'

const URL_STEP = 'Adicione "Obter conteúdo de URL": URL acima, Método POST, Corpo JSON com:'

// Automações do iPhone pelo app Atalhos. Tudo entra como gasto pendente para confirmar na Home.
export default function AutomationsPage() {
  const { data: status, mutate } = useSWR(['automation-status'], () => automationsApi.status())
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const ask = useConfirmDelete()
  // já tem token: confirma antes, porque o atual para de funcionar
  function generate() {
    if (status) ask.ask({ title: 'Gerar novo token? O atual para de funcionar.', label: 'Gerar token', destructive: false, done: null, remove: create })
    else void create()
  }

  async function create() {
    setError(null)
    try { setToken(await automationsApi.createToken()); await mutate(); feedback.done('Token gerado') }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível gerar.') }
  }

  const tokenText = token ?? 'seu token'
  const statusText = status
    ? `Ativo desde ${formatDate(status.createdAt.slice(0, 10))}${status.lastUsedAt ? ` · último uso ${formatDate(status.lastUsedAt.slice(0, 10))}` : ''}`
    : 'Nenhum token ainda.'

  return (
    <>
      {ask.sheet}
      <LargeTitleHeader back title="Automações" />
      <div className="space-y-7 px-4 pt-2">
        <p className="px-4 text-subheadline text-muted-foreground">Compras entram como pendentes. Você confirma no Início.</p>

        <ListGroup header="Seu acesso" footer={error ?? (token ? 'Copie agora. Ele não aparece de novo.' : statusText)}>
          <CopyRow label="URL" value={AUTOMATION_URL} />
          {token && <CopyRow label="Token" value={token} />}
          <li className="p-3">
            <Button variant={status ? 'secondary' : 'default'} size="lg" className="w-full" onClick={generate}>
              Gerar token
            </Button>
          </li>
        </ListGroup>

        <AutomationGuide
          title="Apple Pay"
          steps={[
            'Atalhos > Automação > + > Carteira.',
            'Deixe todos os cartões e comerciantes e ligue "Automação".',
            URL_STEP,
          ]}
          fields={[['t', tokenText], ['s', 'apple_pay'], ['v', 'Quantia'], ['l', 'Comerciante'], ['c', 'Cartão ou Passe']]}
        />

        <AutomationGuide
          title="Toque duplo nas costas"
          steps={[
            'Atalhos > + > atalho novo chamado Troco.',
            'Adicione "Pedir entrada" (Número): Valor?',
            'Adicione "Pedir entrada" (Texto): Onde?',
            URL_STEP,
            'Adicione "Mostrar notificação" com o Conteúdo do URL.',
            'Ajustes do iPhone > Acessibilidade > Toque > Tocar Atrás > Toque Duplo > Troco.',
          ]}
          fields={[['t', tokenText], ['s', 'back_tap'], ['v', 'Entrada (Valor)'], ['l', 'Entrada (Onde)']]}
        />

        <AutomationGuide
          title="SMS do banco"
          steps={[
            'Atalhos > Automação > + > Mensagem.',
            'Remetente: seu banco. Contém: compra. Marque "Executar imediatamente".',
            URL_STEP,
          ]}
          fields={[['t', tokenText], ['s', 'notification'], ['x', 'Mensagem']]}
        />
      </div>
    </>
  )
}
