'use client'

import { CloseBoldDuotoneIcon } from '@solar-icons/react'
import { Sheet, SheetClose, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { GlassButton } from './glass-button'

// Folha modal padrão do app (iOS 26): fechar de vidro | título | ação principal em cápsula.
// O conteúdo vai num <form id={formId}>; a ação do topo envia esse formulário.
interface ModalSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  formId?: string
  actionLabel?: string
  actionDisabled?: boolean
  children: React.ReactNode
}

export function ModalSheet({
  open, onOpenChange, title, formId, actionLabel, actionDisabled, children,
}: ModalSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" showCloseButton={false} className="gap-0">
        <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center px-3 pt-1 pb-2">
          <SheetClose render={<GlassButton type="button" aria-label="Fechar" className="justify-self-start" />}>
            <CloseBoldDuotoneIcon />
          </SheetClose>
          <SheetTitle className="text-headline font-semibold">{title}</SheetTitle>
          {formId && actionLabel ? (
            <GlassButton type="submit" form={formId} size="capsule" tone="prominent"
              className="justify-self-end font-semibold" disabled={actionDisabled}>
              {actionLabel}
            </GlassButton>
          ) : <span />}
        </div>
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 pt-2 pb-6">{children}</div>
      </SheetContent>
    </Sheet>
  )
}
