'use client'

import { ListGroup } from '@/components/ios/list-group'
import type { ReceiptItem } from '@/lib/receipt'
import { formatDate } from '@/lib/utils'
import { Money } from '@/components/shared/money'

// 5.4 passos 4 a 6: avisa de onde veio a leitura e mostra os itens. A foto é sempre anexada.
export function ReceiptResultGroup({
  source, items, duplicateOn,
}: {
  source: 'sefaz' | 'gemini' | 'ocr'
  items: ReceiptItem[]
  // data em que a mesma NFC-e já foi registrada
  duplicateOn?: string | null
}) {
  const note = duplicateOn
    ? <span className="text-destructive">Esta nota já foi registrada em {formatDate(duplicateOn)}.</span>
    : source === 'sefaz'
      ? 'Dados da Sefaz, pelo QR code.'
      : source === 'gemini'
        ? 'Confira antes de registrar.'
        : 'Leitura menos precisa. Confira.'
  // sem itens para mostrar, fica só o aviso
  if (!items.length) return <p className="px-4 text-footnote text-muted-foreground">{note}</p>
  return (
    <ListGroup header="Lido da nota" footer={note}>
      <li className="px-4 py-2">
          <details>
            <summary className="cursor-pointer text-body">{items.length} {items.length === 1 ? 'item' : 'itens'}</summary>
            <ul className="mt-2 space-y-1">
              {items.map((i, k) => (
                <li key={k} className="flex justify-between gap-2 text-subheadline">
                  <span className="truncate">{i.name}</span>
                  <Money cents={i.amount} size="inherit" tone="muted" className="shrink-0" />
                </li>
              ))}
            </ul>
          </details>
        </li>
    </ListGroup>
  )
}
