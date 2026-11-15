'use client'

import { useEffect } from 'react'

// Mede a altura real da tela em --app-height (usada pelo AppShell, classe h-app).
// No iPhone com o app na Tela de Início, o Safari às vezes informa uma altura menor ao abrir
// (ou ao voltar do segundo plano) e só corrige depois de uma rolagem. Nesse modo o app ocupa
// a tela toda, então em pé a altura certa é a da própria tela (screen.height).
export function IosViewportFix() {
  useEffect(() => {
    const root = document.documentElement
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

    const measure = () => {
      let h = window.innerHeight
      if (standalone && ios) {
        const portrait = window.matchMedia('(orientation: portrait)').matches
        const full = portrait ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height)
        // teclado aberto encolhe a área de propósito: aí vale a medida do navegador
        const keyboard = window.visualViewport && window.visualViewport.height < h - 120
        if (!keyboard) h = Math.max(h, full)
      }
      root.style.setProperty('--app-height', `${h}px`)
    }
    const later = () => { measure(); setTimeout(measure, 100); setTimeout(measure, 500) }

    later()
    window.addEventListener('resize', measure)
    window.addEventListener('pageshow', later)
    window.addEventListener('orientationchange', later)
    const onVisible = () => { if (document.visibilityState === 'visible') later() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('pageshow', later)
      window.removeEventListener('orientationchange', later)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return null
}
