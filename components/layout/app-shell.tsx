'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { BottomNav } from './bottom-nav'

// A página em si não rola: o app ocupa a tela inteira (altura em --app-height, medida pelo
// IosViewportFix) e só o <main> rola. Assim a barra de abas fica presa ao fundo da tela mesmo
// quando o iPhone, com o app na Tela de Início, calcula errado a área visível ao abrir.
// Respeita as áreas seguras (notch em cima, indicador de início embaixo).
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const scroller = useRef<HTMLElement>(null)

  // como a janela não rola mais, volta ao topo ao trocar de tela
  useEffect(() => { scroller.current?.scrollTo(0, 0) }, [pathname])

  return (
    <div className="fixed inset-x-0 top-0 flex h-app flex-col overflow-hidden">
      <main
        ref={scroller}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-[env(safe-area-inset-top)] pb-[calc(var(--spacing-tabbar)+max(0.75rem,env(safe-area-inset-bottom))+1.5rem)]"
      >
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
