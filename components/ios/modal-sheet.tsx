'use client'

import { CloseLinearIcon } from '@solar-icons/react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetClose, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { GlassButton } from './glass-button'

// Folha modal padrão do app (iOS 26): fechar de vidro | título | ação principal em cápsula.
// O conteúdo vai num <form id={formId}>; a ação do topo envia esse formulário.
// Com onDelete (edição de algo que pode ser excluído): "Excluir" discreto no topo e o botão
// de salvar vai para baixo, grande. Com secondaryAction (ex.: Arquivar), as duas ficam lado a lado,
// cada uma com metade da largura.
interface ModalSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  formId?: string
  actionLabel?: string
  actionDisabled?: boolean
  onDelete?: () => void
  deleteLabel?: string
  secondaryAction?: { label: string; onClick: () => void; disabled?: boolean }
  children: React.ReactNode
}

export function ModalSheet({
  open, onOpenChange, title, formId, actionLabel, actionDisabled, onDelete, deleteLabel = 'Excluir', secondaryAction, children,
}: ModalSheetProps) {
  const saveBelow = !!onDelete && !!formId && !!actionLabel
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" showCloseButton={false} className="gap-0">
        <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center px-3 pt-1 pb-2">
          <SheetClose render={<GlassButton type="button" aria-label="Fechar" className="justify-self-start" />}>
            <CloseLinearIcon />
          </SheetClose>
          <SheetTitle className="text-headline font-semibold">{title}</SheetTitle>
          {onDelete ? (
            <Button type="button" variant="plain-destructive" size="nav" className="justify-self-end" onClick={onDelete}>
              {deleteLabel}
            </Button>
          ) : formId && actionLabel ? (
            <GlassButton type="submit" form={formId} size="capsule" tone="prominent"
              className="justify-self-end font-semibold" disabled={actionDisabled}>
              {actionLabel}
            </GlassButton>
          ) : <span />}
        </div>
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 pt-2 pb-6">
          {children}
          {saveBelow && (
            <div className={secondaryAction ? 'grid grid-cols-2 gap-3' : undefined}>
              {secondaryAction && (
                <Button type="button" variant="secondary" size="lg" disabled={secondaryAction.disabled} onClick={secondaryAction.onClick}>
                  {secondaryAction.label}
                </Button>
              )}
              <Button type="submit" form={formId} size="lg" className="w-full" disabled={actionDisabled}>{actionLabel}</Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
