'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ListGroup } from '@/components/ios/list-group'

// Adicionar alguém que usa o cartão mas não tem o app: recebe compras e o titular exporta a parte dela.
export function GuestForm({ onAdd }: { onAdd: (name: string) => void }) {
  const [name, setName] = useState('')
  return (
    <ListGroup header="Pessoa sem o app" footer="Recebe compras do cartão. Você exporta a parte dela em PDF.">
      <li className="flex items-center gap-2 px-4">
        <Input aria-label="Nome" variant="bare" value={name} onChange={e => setName(e.target.value)} placeholder="Nome" className="min-w-0 flex-1" />
        <Button type="button" variant="plain" disabled={!name.trim()} onClick={() => { onAdd(name.trim()); setName('') }}>Adicionar</Button>
      </li>
    </ListGroup>
  )
}
