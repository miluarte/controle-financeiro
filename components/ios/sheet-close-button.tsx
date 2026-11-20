'use client'

import { CloseLinearIcon } from '@solar-icons/react'
import { Button } from '@/components/ui/button'
import { SheetClose } from '@/components/ui/sheet'

// Fechar da folha modal: só o X, sem círculo de vidro nem sombra (como o voltar do título).
export function SheetCloseButton({ label = 'Fechar' }: { label?: string }) {
  return (
    <SheetClose render={<Button type="button" variant="plain" size="nav" aria-label={label} className="-ml-1 justify-self-start px-1 focus-visible:border-transparent focus-visible:ring-0" />}>
      <CloseLinearIcon className="size-8" />
    </SheetClose>
  )
}
