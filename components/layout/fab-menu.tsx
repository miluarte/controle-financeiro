'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AddLinearIcon, CloseLinearIcon } from '@solar-icons/react'
import { glassButtonVariants } from '@/components/ios/glass-button'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface FabMenuItem {
  key: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  onSelect: () => void
  // item que escolhe um arquivo: o toque abre o seletor do sistema direto (câmera, fototeca, arquivo)
  onFile?: (file: File) => void
  accept?: string
}

// Botão + que abre as opções empilhadas acima dele (estilo "speed dial"): fundo escurecido,
// cápsulas com ícone e texto alinhadas à direita e o + vira X no mesmo lugar.
export function FabMenu({ items }: { items: FabMenuItem[] }) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)

  useLayoutEffect(() => {
    if (!open) return
    const measure = () => setRect(triggerRef.current?.getBoundingClientRect() ?? null)
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  function select(item: FabMenuItem) {
    setOpen(false)
    item.onSelect()
  }

  const circle = cn(glassButtonVariants(), 'size-tabbar [&_svg]:size-7')

  return (
    <>
      <button ref={triggerRef} type="button" aria-label="Adicionar" aria-expanded={open}
        className={cn(circle, 'text-tint')} onClick={() => setOpen(true)}>
        <AddLinearIcon />
      </button>

      {open && rect && createPortal(
        <div className="fixed inset-0 z-50" role="menu">
          <div className="absolute inset-0 bg-scrim backdrop-blur-glass animate-in fade-in" onClick={() => setOpen(false)} />
          <div className="absolute flex flex-col items-end gap-2"
            style={{ right: window.innerWidth - rect.right, bottom: `calc(${window.innerHeight - rect.top}px + var(--spacing) * 2)` }}>
            {items.map((item, i) => {
              const style = { animationDelay: `${(items.length - 1 - i) * 30}ms` }
              const className = cn(buttonVariants({ size: 'lg' }), 'shadow-floating animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards [&_svg]:size-6')
              return item.onFile ? (
                <label key={item.key} role="menuitem" style={style} className={className}>
                  <item.icon />{item.label}
                  <input type="file" accept={item.accept} className="sr-only"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      setOpen(false)
                      if (file) item.onFile?.(file)
                    }} />
                </label>
              ) : (
                <button key={item.key} type="button" role="menuitem" onClick={() => select(item)} style={style} className={className}>
                  <item.icon />{item.label}
                </button>
              )
            })}
          </div>
          <button type="button" aria-label="Fechar" onClick={() => setOpen(false)}
            className={cn(circle, 'absolute glass-strong text-foreground animate-in spin-in-90')}
            style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}>
            <CloseLinearIcon />
          </button>
        </div>,
        document.body,
      )}
    </>
  )
}
