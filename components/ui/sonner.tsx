'use client'

import { Toaster as Sonner, type ToasterProps } from 'sonner'
import { CheckCircleLinearIcon, DangerCircleLinearIcon, InfoCircleLinearIcon } from '@solar-icons/react'

// Toast do shadcn/ui (sonner) no visual do app: cápsula de vidro no topo, como os avisos do iOS.
// Disparar com `feedback` (lib/feedback.ts).
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="top-center"
      offset="calc(env(safe-area-inset-top) + 0.5rem)"
      mobileOffset="calc(env(safe-area-inset-top) + 0.5rem)"
      duration={2200}
      icons={{
        success: <CheckCircleLinearIcon className="size-5 text-success" />,
        error: <DangerCircleLinearIcon className="size-5 text-destructive" />,
        info: <InfoCircleLinearIcon className="size-5 text-muted-foreground" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: 'glass-strong mx-auto flex w-fit max-w-[min(90vw,24rem)] items-center gap-2 rounded-full px-4 py-2.5 text-subheadline font-medium text-foreground shadow-lg',
          title: 'truncate',
        },
      }}
      {...props}
    />
  )
}
