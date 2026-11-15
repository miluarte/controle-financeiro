'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { NumberField } from '@/components/shared/number-field'
import { FormRow } from '@/components/ios/form-row'
import { LargeTitleHeader } from '@/components/ios/large-title-header'
import { ListGroup } from '@/components/ios/list-group'
import { useSession } from '@/hooks/use-session'
import { disablePush, enablePush, pushState, sendTest, type PushState } from '@/lib/push'
import { supabase, unwrap } from '@/lib/supabase/client'

type Setting = { type: string; enabled: boolean; time: string | null; days_before: number | null }

const TYPES: { type: string; label: string; hint: string; time?: boolean; days?: boolean }[] = [
  { type: 'bill_due', label: 'Contas a vencer', hint: 'Aviso antes e no dia do vencimento.', time: true, days: true },
  { type: 'log_reminder', label: 'Lembrete de registro', hint: 'À noite, se nenhum gasto foi registrado no dia.', time: true },
  { type: 'weekly_summary', label: 'Resumo da semana', hint: 'Domingo: gasto da semana, comparação e maior categoria.', time: true },
  { type: 'smart_alerts', label: 'Alertas de orçamento', hint: 'Quando o gasto do mês chega a 80% e a 100% do orçamento.' },
  { type: 'family_events', label: 'Eventos da família', hint: 'Compra atribuída a você, compra de membro no seu cartão, fatura fechada.' },
]

const STATE_TEXT: Record<PushState, string> = {
  unsupported: 'Este navegador não recebe notificações.',
  'needs-install': 'No iPhone, as notificações só funcionam com o app na Tela de Início: no Safari, toque em Compartilhar e depois em Adicionar à Tela de Início. Abra o Troco por lá e volte aqui.',
  denied: 'As notificações estão bloqueadas. Libere em Ajustes do iPhone > Notificações > Troco.',
  off: 'Ative para receber os avisos neste aparelho.',
  on: 'Este aparelho está recebendo notificações.',
}

// 5.13: notificações por tipo, com horário e antecedência, e ativação no aparelho.
export default function NotificationsPage() {
  const { session } = useSession()
  const [state, setState] = useState<PushState | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const { data: settings, mutate } = useSWR(['notification-settings'], async () =>
    unwrap(await supabase.from('notification_settings').select('type, enabled, time, days_before')) as Setting[])

  useEffect(() => { pushState().then(setState) }, [])

  async function toggleDevice() {
    setBusy(true); setMessage(null)
    try {
      if (state === 'on') await disablePush()
      else await enablePush(session!.user.id)
      setState(await pushState())
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Não foi possível ativar.') }
    finally { setBusy(false) }
  }

  async function update(type: string, patch: Partial<Setting>) {
    await supabase.from('notification_settings').update(patch).eq('type', type)
    mutate()
  }

  const get = (type: string) => settings?.find(s => s.type === type)

  return (
    <>
      <LargeTitleHeader back title="Notificações" />
      <div className="space-y-7 px-4 pt-2">
        <ListGroup header="Este aparelho" footer={message ?? (state ? STATE_TEXT[state] : undefined)}>
          <li className="space-y-2 p-3">
            <Button size="lg" className="w-full" disabled={busy || !state || state === 'unsupported' || state === 'needs-install' || state === 'denied'}
              onClick={toggleDevice}>
              {state === 'on' ? 'Desativar neste aparelho' : 'Ativar notificações'}
            </Button>
            {state === 'on' && (
              <Button variant="secondary" size="lg" className="w-full" disabled={busy}
                onClick={async () => { await sendTest(); setMessage('Teste enviado. Ele chega em até 10 minutos.') }}>
                Enviar teste
              </Button>
            )}
          </li>
        </ListGroup>

        {TYPES.map(t => {
          const s = get(t.type)
          return (
            <ListGroup key={t.type} footer={t.hint}>
              <FormRow label={t.label}>
                <Switch checked={s?.enabled ?? true} onCheckedChange={v => update(t.type, { enabled: v })} />
              </FormRow>
              {t.time && s?.enabled !== false && (
                <FormRow label="Horário" htmlFor={`${t.type}-time`}>
                  <Input id={`${t.type}-time`} type="time" variant="bare" value={s?.time?.slice(0, 5) ?? ''}
                    onChange={e => e.target.value && update(t.type, { time: e.target.value })} className="w-auto text-right" />
                </FormRow>
              )}
              {t.days && s?.enabled !== false && (
                <FormRow label="Dias de antecedência" htmlFor={`${t.type}-days`}>
                  <NumberField id={`${t.type}-days`} min={0} max={30} value={s?.days_before ?? 2}
                    onChange={v => update(t.type, { days_before: v })} className="w-16 text-right" />
                </FormRow>
              )}
            </ListGroup>
          )
        })}
      </div>
    </>
  )
}
