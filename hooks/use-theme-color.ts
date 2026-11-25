'use client'

import { useEffect } from 'react'

// Enquanto a tela está aberta, pinta a barra de status do iPhone (meta theme-color) com a cor de um token
// (ex.: '--surface-hero'); ao sair, volta o que estava. O valor vem do CSS, já resolvido para claro/escuro.
export function useThemeColor(token: string) {
  useEffect(() => {
    const metas = Array.from(document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'))
    const before = metas.map(m => m.content)
    const apply = () => {
      const color = getComputedStyle(document.documentElement).getPropertyValue(token).trim()
      if (color) metas.forEach(m => { m.content = color })
    }
    apply()
    const dark = window.matchMedia('(prefers-color-scheme: dark)')
    dark.addEventListener('change', apply)
    return () => {
      dark.removeEventListener('change', apply)
      metas.forEach((m, i) => { m.content = before[i] })
    }
  }, [token])
}
