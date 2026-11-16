'use client'

import { useState } from 'react'
import { TrashBinMinimalisticLinearIcon } from '@solar-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { CurrencyInput } from '@/components/shared/currency-input'
import type { ReceiptItem } from '@/lib/receipt'
import { formatCurrency } from '@/lib/utils'

// Itens da compra (o que foi comprado). Vêm da nota fiscal ou são digitados. Valor do item é opcional.
export function ItemsEditor({ items, onChange, total, disabled }: {
  items: ReceiptItem[]; onChange: (items: ReceiptItem[]) => void; total: number; disabled?: boolean
}) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState(0)
  const sum = items.reduce((s, i) => s + (i.amount || 0), 0)

  function add() {
    if (!name.trim()) return
    onChange([...items, { name: name.trim(), amount }])
    setName(''); setAmount(0)
  }

  const footer = sum > 0 && sum !== total ? `Soma dos itens: ${formatCurrency(sum)}` : undefined

  return (
    <ListGroup header={`Itens da compra${items.length ? ` · ${items.length}` : ''}`} footer={footer}>
      {items.map((i, k) => (
        <ListRow key={k} title={i.name}
          trailing={
            <span className="flex items-center gap-1">
              {i.amount > 0 && <span className="tabular-nums text-muted-foreground">{formatCurrency(i.amount)}</span>}
              {!disabled && (
                <Button type="button" variant="plain" size="icon" aria-label="Remover item" className="text-destructive"
                  onClick={() => onChange(items.filter((_, j) => j !== k))}>
                  <TrashBinMinimalisticLinearIcon />
                </Button>
              )}
            </span>
          } />
      ))}
      {!disabled && (
        <li className="flex items-center gap-2 px-4">
          <Input aria-label="Item" variant="bare" value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
            placeholder="Novo item" className="min-w-0 flex-1" />
          <CurrencyInput aria-label="Valor do item" variant="bare" value={amount} onChange={setAmount} placeholder="Valor" className="w-24 text-right" />
          <Button type="button" variant="plain" disabled={!name.trim()} onClick={add}>Incluir</Button>
        </li>
      )}
    </ListGroup>
  )
}
