"use client"

import * as React from "react"
import { cn } from "cn"

interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  id?: string
  disabled?: boolean
  className?: string
}

// Não existe Switch no shadcn/base-ui já instalado neste projeto — componente
// próprio e isolado, seguindo a mesma convenção visual (cn, data-slot, tokens
// de tema) dos demais componentes de components/ui.
function Switch({ checked, onCheckedChange, id, disabled, className }: SwitchProps) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      data-slot="switch"
      data-state={checked ? "checked" : "unchecked"}
      className={cn(
        "peer inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-input dark:bg-input/80",
        className
      )}
    >
      <span
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-5 rounded-full bg-background shadow-xs ring-0 transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5"
        )}
      />
    </button>
  )
}

export { Switch }
