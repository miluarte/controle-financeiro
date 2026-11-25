'use client'

import { useState } from 'react'
import { TrashBinMinimalisticLinearIcon } from '@solar-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ListGroup } from '@/components/ios/list-group'
import { CurrencyInput } from '@/components/shared/currency-input'
import { SelectField } from '@/components/shared/select-field'
import type { ReceiptItem } from '@/lib/receipt'
import { cn, formatCurrency } from '@/lib/utils'
import { Money } from '@/components/shared/money'

// Itens da compra (o que foi comprado). Vêm da nota fiscal ou são digitados; tocar num item edita.
// Valor do item é opcional. Com owners (compra dividida por item), cada item mostra de quem é no lugar da lixeira.
// ownerName: compra já dividida; mostra de quem é cada item (só leitura, sem lixeira).
export function ItemsEditor({ items, onChange, total, disabled, owners, ownerName }: {
  items: ReceiptItem[]; onChange: (items: ReceiptItem[]) => void; total: number; disabled?: boolean
  owners?: { options: { value: string; label: string }[]; fallback: string }
  ownerName?: (owner: string | undefined) => string
}) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState(0)
  // item em edição (tocar no item abre os campos dele)
  const [editing, setEditing] = useState<number | null>(null)
  const [draft, setDraft] = useState<ReceiptItem>({ name: '', amount: 0 })
  const sum = items.reduce((s, i) => s + (i.amount || 0), 0)

  function add() {
    if (!name.trim()) return
    onChange([...items, { name: name.trim(), amount }])
    setName(''); setAmount(0)
  }

  function startEdit(k: number) {
    if (disabled) return
    setEditing(k); setDraft(items[k])
  }

  function saveEdit() {
    if (editing == null) return
    if (draft.name.trim()) onChange(items.map((it, j) => (j === editing ? { ...it, name: draft.name.trim(), amount: draft.amount } : it)))
    setEditing(null)
  }

  const footer = sum > 0 && sum !== total ? `Soma dos itens: ${formatCurrency(sum)}` : undefined

  return (
    <ListGroup header={`Itens da compra${items.length ? ` · ${items.length}` : ''}`} footer={footer}>
      {items.map((i, k) => editing === k ? (
        <li key={k} className="flex items-center gap-2 px-4" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveEdit() } }}>
          <Input aria-label="Nome do item" variant="bare" autoFocus value={draft.name}
            onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} className="min-w-0 flex-1" />
          <CurrencyInput aria-label="Valor do item" variant="bare" value={draft.amount}
            onChange={v => setDraft(d => ({ ...d, amount: v }))} placeholder="Valor" className="w-24 text-right" />
          <Button type="button" variant="plain" onClick={saveEdit}>Salvar</Button>
        </li>
      ) : (
        // botão do item e botão de remover lado a lado (botão dentro de botão não vale no HTML)
        <li key={k} className={cn('flex min-h-row items-center gap-1 border-b border-separator pl-4 last:border-b-0', owners || ownerName ? 'pr-4' : 'pr-2')}>
          <button type="button" disabled={disabled} onClick={() => startEdit(k)}
            className="flex min-w-0 flex-1 items-center justify-between gap-2 py-2 text-left text-body">
            <span className="truncate">{i.name}</span>
            {i.amount > 0 && <Money cents={i.amount} size="inherit" tone="muted" className="shrink-0" />}
          </button>
          {ownerName ? (
            <span className="shrink-0 pl-2 text-subheadline text-muted-foreground">{ownerName(i.owner)}</span>
          ) : owners ? (
            <SelectField id={`item-owner-${k}`} className="shrink-0 pl-2"
              value={owners.options.some(o => o.value === i.owner) ? i.owner! : owners.fallback}
              onChange={v => onChange(items.map((x, j) => (j === k ? { ...x, owner: v } : x)))}
              options={owners.options} />
          ) : !disabled && (
            <Button type="button" variant="plain-destructive" size="icon" aria-label="Excluir item"
              onClick={() => onChange(items.filter((_, j) => j !== k))}>
              <TrashBinMinimalisticLinearIcon />
            </Button>
          )}
        </li>
      ))}
      {!disabled && !ownerName && (
        // Enter (ou "Ir" no teclado do iPhone) inclui o item em vez de enviar o formulário inteiro
        <li className="flex items-center gap-2 px-4" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}>
          <Input aria-label="Item" variant="bare" value={name} onChange={e => setName(e.target.value)}
            placeholder="Novo item" className="min-w-0 flex-1" />
          <CurrencyInput aria-label="Valor do item" variant="bare" value={amount} onChange={setAmount} placeholder="Valor" className="w-24 text-right" />
          <Button type="button" variant="plain" disabled={!name.trim()} onClick={add}>Adicionar</Button>
        </li>
      )}
    </ListGroup>
  )
}
