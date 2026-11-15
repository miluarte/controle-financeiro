'use client'

import { useEffect } from 'react'

// iPhone com o app na Tela de Início: ao abrir (ou voltar do segundo plano) o Safari às vezes
// calcula a altura da tela errado até a primeira rolagem, e o que é fixo embaixo (barra de abas,
// folha de registro) fica mais alto. Uma rolagem mínima e imediata força o recálculo.
export function IosViewportFix() {
  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
    if (!standalone || !ios) return

    const nudge = () => {
      const y = window.scrollY
      window.scrollTo(0, y + 1)
      requestAnimationFrame(() => window.scrollTo(0, y))
    }
    const later = () => setTimeout(nudge, 60)

    later()
    window.addEventListener('pageshow', later)
    window.addEventListener('orientationchange', later)
    const onVisible = () => { if (document.visibilityState === 'visible') later() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('pageshow', later)
      window.removeEventListener('orientationchange', later)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return null
}
