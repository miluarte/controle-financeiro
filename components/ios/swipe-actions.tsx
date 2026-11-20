'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { TrashBinTrashLinearIcon } from '@solar-icons/react'

export interface SwipeExtra { label: string; icon: React.ReactNode; onClick: () => void }
import { cn } from '@/lib/utils'

// largura do botão revelado (w-20)
const ACTION_WIDTH = 80
// passar desta fração da largura executa direto (deslizar até o fim, como no iOS)
const FULL_SWIPE = 0.55
const OPEN_EVENT = 'troco:swipe-open'

interface SwipeActionsProps {
  onDelete: () => void
  label?: string
  // ação extra ao lado da lixeira (ex.: fixar como conta fixa)
  extra?: SwipeExtra
  children: React.ReactNode
}

// Deslizar a linha para a esquerda revela a lixeira (iOS, WhatsApp). Só uma linha aberta por vez.
export function SwipeActions({ onDelete, label = 'Excluir', extra, children }: SwipeActionsProps) {
  const reveal = ACTION_WIDTH * (extra ? 2 : 1)
  const id = useId()
  const box = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; base: number; axis: 'x' | 'y' | null } | null>(null)
  const swiped = useRef(false)
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    const close = (e: Event) => { if ((e as CustomEvent<string>).detail !== id) setOffset(0) }
    window.addEventListener(OPEN_EVENT, close)
    return () => window.removeEventListener(OPEN_EVENT, close)
  }, [id])

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    drag.current = { x: e.clientX, y: e.clientY, base: offset, axis: null }
    swiped.current = false
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (!d.axis) {
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
        d.axis = 'x'
        e.currentTarget.setPointerCapture(e.pointerId)
        setDragging(true)
        window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: id }))
      } else if (Math.abs(dy) > 8) {
        d.axis = 'y'
      }
    }
    if (d.axis === 'x') {
      swiped.current = true
      setOffset(Math.min(0, d.base + dx))
    }
  }

  function onPointerEnd() {
    const d = drag.current
    drag.current = null
    if (d?.axis !== 'x') return
    setDragging(false)
    const width = box.current?.offsetWidth ?? 0
    if (width && -offset > width * FULL_SWIPE) { setOffset(-reveal); onDelete(); return }
    setOffset(-offset > reveal / 2 ? -reveal : 0)
  }

  // toque depois de arrastar, ou com a linha aberta, só fecha (não abre o item)
  function onClickCapture(e: React.MouseEvent) {
    if (swiped.current || offset !== 0) {
      e.preventDefault(); e.stopPropagation()
      if (!swiped.current) setOffset(0)
      swiped.current = false
    }
  }

  return (
    <div ref={box} className="relative overflow-hidden">
      <div style={{ width: Math.max(-offset, 0) }}
        className={cn('absolute inset-y-0 right-0 flex overflow-hidden', offset === 0 && 'invisible')}>
        {extra && (
          <button type="button" aria-label={extra.label} tabIndex={offset ? 0 : -1}
            onClick={() => { setOffset(0); extra.onClick() }}
            className="flex flex-1 items-center justify-center overflow-hidden bg-tint text-primary-foreground [&_svg]:size-6 [&_svg]:shrink-0">
            {extra.icon}
          </button>
        )}
        <button type="button" aria-label={label} tabIndex={offset ? 0 : -1}
          onClick={() => onDelete()}
          className="flex flex-1 items-center justify-center overflow-hidden bg-destructive text-destructive-foreground">
          <TrashBinTrashLinearIcon className="size-6 shrink-0" />
        </button>
      </div>
      <div
        onPointerDown={onPointerDown} onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd}
        onClickCapture={onClickCapture}
        style={{ transform: `translateX(${offset}px)` }}
        className={cn('relative touch-pan-y bg-grouped', !dragging && 'transition-transform duration-200 ease-out')}
      >
        {children}
      </div>
    </div>
  )
}
