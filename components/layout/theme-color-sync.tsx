'use client'

import { useEffect } from 'react'

// Barra de status do iPhone (meta theme-color) sempre na cor da faixa do topo (StatusBarStrip), que o
// CSS troca por tela (--screen-top em globals.css: rosa no Início, branco nas telas grouped, cinza nas
// outras). Recalcula quando a tela muda (DOM ou atributos do html) e quando o tema claro/escuro muda.
// Converte qualquer cor do CSS (lab, oklch…) para hex, que toda versão do Safari entende no theme-color.
function toHex(color: string) {
  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) return color
  ctx.fillStyle = color
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return '#' + [r, g, b].map(n => n.toString(16).padStart(2, '0')).join('')
}

export function ThemeColorSync() {
  useEffect(() => {
    const html = document.documentElement
    const metas = () => Array.from(document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'))
    let frame = 0
    const apply = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const strip = document.querySelector('[data-status-strip]')
        const color = strip ? getComputedStyle(strip).backgroundColor : ''
        if (!color || color === 'rgba(0, 0, 0, 0)') return
        const hex = toHex(color)
        metas().forEach(m => { if (m.content !== hex) m.content = hex })
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
