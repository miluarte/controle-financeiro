'use client'

import { useEffect } from 'react'

// Barra de status do iPhone (meta theme-color) sempre na cor do fundo da tela aberta. A cor vem do fundo
// do html, que o CSS troca por tela (globals.css: rosa no Início, branco nas telas grouped, cinza nas
// outras). Recalcula quando a tela muda (DOM ou atributos do html) e quando o tema claro/escuro muda.
export function ThemeColorSync() {
  useEffect(() => {
    const html = document.documentElement
    const metas = () => Array.from(document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'))
    let frame = 0
    const apply = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const color = getComputedStyle(html).backgroundColor
        if (!color || color === 'rgba(0, 0, 0, 0)') return
        metas().forEach(m => { if (m.content !== color) m.content = color })
      })
    }
    apply()
    const observer = new MutationObserver(apply)
    observer.observe(html, { attributes: true, attributeFilter: ['data-top', 'data-theme', 'class'] })
    observer.observe(document.body, { childList: true, subtree: true })
    const dark = window.matchMedia('(prefers-color-scheme: dark)')
    dark.addEventListener('change', apply)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      dark.removeEventListener('change', apply)
    }
  }, [])
  return null
}
