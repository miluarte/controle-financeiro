'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { BottomNav } from './bottom-nav'
import { SideNav } from './side-nav'

// A página em si não rola: o app ocupa a área visível (altura em --app-height, medida no <head>
// do app/layout.tsx) e só o <main> rola. A barra de abas fica presa ao fundo dessa área.
// Respeita as áreas seguras (notch em cima, indicador de início embaixo).
// Desktop (lg): menu lateral no lugar da barra de abas e conteúdo centralizado com largura máxima.
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const scroller = useRef<HTMLElement>(null)

  // como a janela não rola mais, volta ao topo ao trocar de tela
  useEffect(() => { scroller.current?.scrollTo(0, 0) }, [pathname])

  return (
    <div className="fixed inset-x-0 top-0 flex h-app flex-col overflow-hidden lg:flex-row">
      <SideNav />
      <main
        ref={scroller}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-[env(safe-area-inset-top)] pb-[calc(var(--spacing-tabbar)+max(0.75rem,env(safe-area-inset-bottom))+1.5rem)] lg:pt-6 lg:pb-12"
      >
        <div className="lg:mx-auto lg:max-w-3xl">{children}</div>
      </main>
      <BottomNav />
    </div>
  )
}
