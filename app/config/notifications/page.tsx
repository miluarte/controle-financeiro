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
import { feedback } from '@/lib/feedback'

type Setting = { type: string; enabled: boolean; time: string | null; days_before: number | null }

const TYPES: { type: string; label: string; hint: string; time?: boolean; days?: boolean }[] = [
  { type: 'bill_due', label: 'Contas a vencer', hint: '', time: true, days: true },
  { type: 'log_reminder', label: 'Lembrete de registro', hint: 'Se não registrar nada no dia.', time: true },
  { type: 'weekly_summary', label: 'Resumo da semana', hint: 'Aos domingos.', time: true },
  { type: 'smart_alerts', label: 'Alertas de orçamento', hint: 'Em 80% e 100%.' },
  { type: 'family_events', label: 'Eventos da família', hint: '' },
]

const STATE_TEXT: Record<PushState, string> = {
  unsupported: 'Este navegador não recebe notificações.',
  'needs-install': 'No iPhone, adicione o app à Tela de Início (Safari > Compartilhar) e abra por lá.',
  denied: 'Bloqueadas. Libere nos Ajustes do iPhone > Notificações > Troco.',
  off: '',
  on: '',
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
      const next = await pushState()
      setState(next)
      feedback.done(next === 'on' ? 'Avisos ligados' : 'Avisos desligados')
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
        <ListGroup header="Este aparelho" footer={message ?? (state ? STATE_TEXT[state] || undefined : undefined)}>
          <li className={state === 'on' ? 'grid grid-cols-2 gap-3 p-3' : 'p-3'}>
            <Button size="lg" variant={state === 'on' ? 'secondary' : 'default'} className="w-full" disabled={busy || !state || state === 'unsupported' || state === 'needs-install' || state === 'denied'}
              onClick={toggleDevice}>
              {state === 'on' ? 'Desativar' : 'Ativar notificações'}
            </Button>
            {state === 'on' && (
              <Button size="lg" className="w-full" disabled={busy}
                onClick={async () => { await sendTest(); setMessage('Teste enviado. Deve chegar em alguns segundos.') }}>
                Enviar teste
              </Button>
            )}
          </li>
        </ListGroup>

        {TYPES.map(t => {
          const s = get(t.type)
          return (
            <ListGroup key={t.type} footer={t.hint || undefined}>
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
