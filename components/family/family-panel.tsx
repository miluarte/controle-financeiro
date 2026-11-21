'use client'

import { useState } from 'react'
import { CopyLinearIcon, RefreshLinearIcon } from '@solar-icons/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { FormRow } from '@/components/ios/form-row'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { useFamilyMembers } from '@/hooks/use-family'
import { useRefresh } from '@/hooks/use-refresh'
import { useSession } from '@/hooks/use-session'
import { familyApi } from '@/lib/api/family'
import type { Family } from '@/lib/types'
import { MemberAvatar } from './member-avatar'
import { GuestForm } from './guest-form'
import { feedback } from '@/lib/feedback'

// FAM-3, FAM-5 e FAM-7: código, membros, aprovação, remoção e saída.
export function FamilyPanel({ family, isAdmin }: { family: Family; isAdmin: boolean }) {
  const { session } = useSession()
  const members = useFamilyMembers()
  const refresh = useRefresh()
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const me = session?.user.id
  const pending = members.filter(m => m.status === 'pending')
  const active = members.filter(m => m.status === 'active')

  async function run(fn: () => Promise<unknown>, done: string) {
    setError(null)
    try { await fn(); await refresh(); feedback.done(done) }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível concluir.') }
  }

  async function share() {
    const text = `Entre na família "${family.name}" no Troco com o código ${family.code}`
    try {
      if (navigator.share) await navigator.share({ text })
      else { await navigator.clipboard.writeText(family.code); setCopied(true); setTimeout(() => setCopied(false), 1500) }
    } catch { /* compartilhamento cancelado */ }
  }

  return (
    <div className="space-y-7">
      <section className="space-y-1 rounded-3xl bg-grouped p-4 text-center">
        <p className="text-subheadline text-muted-foreground">{family.name}</p>
        <p className="font-mono text-title1 font-bold tracking-widest">{family.code}</p>
        <p className="text-footnote text-muted-foreground">Código para entrar na família</p>
        <div className="flex justify-center gap-2 pt-2">
          <Button variant="secondary" size="sm" className="rounded-full" onClick={share}>
            <CopyLinearIcon className="size-4" />{copied ? 'Copiado' : 'Compartilhar'}
          </Button>
          {isAdmin && (
            <Button variant="secondary" size="sm" className="rounded-full"
              onClick={() => { if (confirm('Gerar novo código? O atual deixa de valer.')) run(() => familyApi.regenerateCode(), 'Novo código gerado') }}>
              <RefreshLinearIcon className="size-4" />Gerar código
            </Button>
          )}
        </div>
      </section>

      {isAdmin && (
        <ListGroup footer="Ninguém novo consegue entrar.">
          <FormRow label="Pausar novas entradas">
            <Switch checked={family.entriesPaused} onCheckedChange={v => run(() => familyApi.setPaused(v), v ? 'Entradas pausadas' : 'Entradas liberadas')} />
          </FormRow>
        </ListGroup>
      )}

      {isAdmin && pending.length > 0 && (
        <ListGroup header={`Pedidos de entrada · ${pending.length}`}>
          {pending.map(m => (
            <ListRow key={m.userId}
              leading={<MemberAvatar name={m.name} color={m.avatarColor} />}
              title={m.name}
              trailing={
                <span className="flex gap-2">
                  <Button size="sm" className="rounded-full" onClick={() => run(() => familyApi.approve(m.userId), 'Aprovado')}>Aprovar</Button>
                  <Button size="sm" variant="secondary" className="rounded-full" onClick={() => run(() => familyApi.remove(m.userId), 'Recusado')}>Recusar</Button>
                </span>
              } />
          ))}
        </ListGroup>
      )}

      <ListGroup header={`Membros · ${active.length}`} footer={isAdmin ? 'Toque num membro para remover.' : undefined}>
        {active.map(m => (
          <ListRow key={m.userId}
            onClick={isAdmin && m.userId !== me
              ? () => { if (confirm(`Remover ${m.name} da família? As compras continuam no histórico.`)) run(() => familyApi.remove(m.userId), 'Removido') }
              : undefined}
            leading={<MemberAvatar name={m.name} color={m.avatarColor} />}
            title={m.userId === me ? `${m.name} (você)` : m.name}
            subtitle={m.isGuest ? 'Sem o app' : undefined}
            trailing={m.role === 'admin' ? <Badge variant="secondary">Admin</Badge> : undefined} />
        ))}
      </ListGroup>

      <GuestForm onAdd={name => run(() => familyApi.addGuest(name), 'Pessoa adicionada')} />

      {error && <p className="px-4 text-footnote text-destructive">{error}</p>}

      <ListGroup footer={isAdmin && active.length > 1 ? 'O membro mais antigo vira admin.' : undefined}>
        <ListRow tone="destructive" title="Sair da família"
          onClick={() => { if (confirm('Sair da família? Você perde o acesso aos cartões compartilhados.')) run(() => familyApi.leave(), 'Você saiu da família') }} />
      </ListGroup>
    </div>
  )
}
