'use client'

import { useEffect } from 'react'

// Marca o <html> com data-standalone quando o app roda da Tela de Início do iPhone.
// O CSS (app/globals.css) já trata isso por @media (display-mode: standalone); a marca cobre
// as versões do iOS que só informam navigator.standalone. Com ela, o html ganha a altura da
// tela inteira e o AppShell usa 100lvh (contorno do WebKit 301108 no iOS 26).
export function IosViewportFix() {
  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    if (standalone) document.documentElement.setAttribute('data-standalone', '')
  }, [])

  return null
}
