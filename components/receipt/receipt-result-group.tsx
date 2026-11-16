'use client'

import { Switch } from '@/components/ui/switch'
import { FormRow } from '@/components/ios/form-row'
import { ListGroup } from '@/components/ios/list-group'
import type { ReceiptItem } from '@/lib/receipt'
import { formatCurrency, formatDate } from '@/lib/utils'

// 5.4 passos 4 a 6: avisa de onde veio a leitura, mostra os itens e oferece anexar a foto.
export function ReceiptResultGroup({
  source, items, attach, onAttachChange, attachDisabled, duplicateOn,
}: {
  source: 'sefaz' | 'gemini' | 'ocr'
  items: ReceiptItem[]
  attach: boolean
  onAttachChange: (v: boolean) => void
  attachDisabled?: boolean
  // data em que a mesma NFC-e já foi registrada
  duplicateOn?: string | null
}) {
  return (
    <ListGroup
      header="Lido da nota"
      footer={duplicateOn
        ? <span className="text-destructive">Esta nota já foi registrada em {formatDate(duplicateOn)}.</span>
        : source === 'sefaz'
        ? 'Dados da Sefaz, pelo QR code.'
        : source === 'gemini'
          ? 'Confira antes de registrar.'
          : 'Leitura menos precisa. Confira.'}
    >
      {items.length > 0 && (
        <li className="px-4 py-2">
          <details>
            <summary className="cursor-pointer text-body">{items.length} {items.length === 1 ? 'item' : 'itens'}</summary>
            <ul className="mt-2 space-y-1">
              {items.map((i, k) => (
                <li key={k} className="flex justify-between gap-2 text-subheadline">
                  <span className="truncate">{i.name}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">{formatCurrency(i.amount)}</span>
                </li>
              ))}
            </ul>
          </details>
        </li>
      )}
      <FormRow label="Anexar a foto">
        <Switch checked={attach} onCheckedChange={onAttachChange} disabled={attachDisabled} />
      </FormRow>
    </ListGroup>
  )
}
