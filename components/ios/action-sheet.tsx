'use client'

import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ListGroup } from './list-group'

export interface ActionSheetAction {
  label: string
  destructive?: boolean
  onSelect: () => void | Promise<void>
}

// Folha de ações do iOS: pergunta o que fazer (ex.: excluir só esta parcela ou a compra inteira).
export function ActionSheet({ open, onOpenChange, title, actions }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; actions: ActionSheetAction[]
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" showCloseButton={false} className="gap-3 px-3 pb-3">
        <SheetTitle className="px-4 pt-1 text-center text-footnote font-normal text-muted-foreground">{title}</SheetTitle>
        <ListGroup>
          {actions.map(a => (
            <li key={a.label} className="border-b border-separator last:border-b-0">
              <Button type="button" variant={a.destructive ? 'plain-destructive' : 'plain'} size="nav"
                className="h-row w-full text-body"
                onClick={async () => { onOpenChange(false); await a.onSelect() }}>
                {a.label}
              </Button>
            </li>
          ))}
        </ListGroup>
        <Button type="button" variant="secondary" size="lg" className="w-full" onClick={() => onOpenChange(false)}>Cancelar</Button>
      </SheetContent>
    </Sheet>
  )
}
