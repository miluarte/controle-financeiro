'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// Última linha de uma lista para incluir um texto novo (ex.: nome da maquininha). Enter inclui
// o texto em vez de enviar o formulário inteiro.
export function AddRow({ label, placeholder, onAdd }: { label: string; placeholder: string; onAdd: (text: string) => void }) {
  const [text, setText] = useState('')
  const add = () => { const v = text.trim(); if (v) { onAdd(v); setText('') } }
  return (
    <li className="flex items-center gap-2 pl-4 pr-2" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}>
      <Input aria-label={label} variant="bare" value={text} onChange={e => setText(e.target.value)}
        placeholder={placeholder} className="min-w-0 flex-1" />
      <Button type="button" variant="plain" disabled={!text.trim()} onClick={add}>Adicionar</Button>
    </li>
  )
}
