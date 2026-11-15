'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormRow } from '@/components/ios/form-row'
import { ListGroup } from '@/components/ios/list-group'
import { useRefresh } from '@/hooks/use-refresh'
import { familyApi } from '@/lib/api/family'

// FAM-1 e FAM-4: criar uma família ou entrar com código.
export function NoFamily() {
  const refresh = useRefresh()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(fn: () => Promise<void>) {
    setBusy(true); setError(null)
    try { await fn(); await refresh() }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível concluir.') }
    finally { setBusy(false) }
  }

  return (
    <div className="space-y-7">
      <p className="px-4 text-subheadline text-muted-foreground">
        Na família, cada pessoa continua com as próprias finanças privadas. O que se compartilha são só os cartões que o titular liberar.
      </p>

      <form onSubmit={e => { e.preventDefault(); if (name.trim()) run(() => familyApi.create(name.trim())) }} className="space-y-3">
        <ListGroup header="Criar família" footer="Você vira admin e recebe um código para convidar as pessoas.">
          <FormRow label="Nome" htmlFor="fam-name">
            <Input id="fam-name" variant="bare" value={name} onChange={e => setName(e.target.value)} placeholder="Família Silva" className="text-right" />
          </FormRow>
        </ListGroup>
        <Button type="submit" size="lg" className="w-full" disabled={busy || !name.trim()}>Criar família</Button>
      </form>

      <form onSubmit={e => { e.preventDefault(); if (code.trim()) run(() => familyApi.join(code.trim())) }} className="space-y-3">
        <ListGroup header="Entrar com código" footer="A entrada fica pendente até o admin aprovar.">
          <FormRow label="Código" htmlFor="fam-code">
            <Input id="fam-code" variant="bare" value={code} maxLength={8} autoCapitalize="characters"
              onChange={e => setCode(e.target.value.toUpperCase())} placeholder="ABCD2345" className="text-right font-mono tracking-widest" />
          </FormRow>
        </ListGroup>
        <Button type="submit" variant="secondary" size="lg" className="w-full" disabled={busy || code.trim().length !== 8}>Pedir para entrar</Button>
      </form>

      {error && <p className="px-4 text-footnote text-destructive">{error}</p>}
    </div>
  )
}
