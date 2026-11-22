'use client'

import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ListGroup } from './list-group'

export interface ActionSheetAction {
  label: string
  destructive?: boolean
  onSelect: () => void | Promise<void>
}

// Folha de ações do iOS: pergunta o que fazer. Várias opções (ex.: só esta parcela ou a compra inteira) ficam
// em lista com Cancelar embaixo; uma opção só fica lado a lado com Cancelar.
export function ActionSheet({ open, onOpenChange, title, actions }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; actions: ActionSheetAction[]
}) {
  const single = actions.length === 1 ? actions[0] : null
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" showCloseButton={false} className="gap-3 px-3 pb-3">
        <SheetTitle className="px-4 pt-1 text-center text-footnote font-normal text-muted-foreground">{title}</SheetTitle>
        {single ? (
          // uma ação só (ex.: Excluir): lado a lado com Cancelar; a ação à esquerda, do tamanho do texto,
          // em vermelho claro; Cancelar à direita ocupando o resto
          <div className="flex gap-3">
            <Button type="button" variant={single.destructive ? 'destructive' : 'secondary'} size="lg" className="shrink-0 px-6"
              onClick={async () => { onOpenChange(false); await single.onSelect() }}>
              {single.label}
            </Button>
            <Button type="button" variant="secondary" size="lg" className="min-w-0 flex-1" onClick={() => onOpenChange(false)}>Cancelar</Button>
          </div>
        ) : (
        <>
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
        </>
        )}
      </SheetContent>
    </Sheet>
  )
}
