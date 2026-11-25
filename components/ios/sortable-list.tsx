'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

// segurar este tempo (ms) sem mexer o dedo ativa o arrastar, como no iOS
const HOLD_MS = 350
const MOVE_TOLERANCE = 8
// perto da borda da área que rola, a lista rola sozinha
const EDGE = 72
const EDGE_STEP = 12

interface SortableListProps<T> {
  items: T[]
  getId: (item: T) => string
  onReorder: (ids: string[]) => void | Promise<void>
  // conteúdo da linha, sem <li> (ex.: <ListRow bare />)
  renderItem: (item: T, dragging: boolean) => React.ReactNode
}

type Drag = {
  id: string; from: number; pointerId: number
  startY: number; startScroll: number
  tops: number[]; heights: number[]
}

// Itens de uma ListGroup que se reordenam segurando e arrastando (Ajustes do iPhone, Lembretes).
// Renderiza só os <li>; vai dentro da <ul> da ListGroup.
export function SortableList<T>({ items, getId, onReorder, renderItem }: SortableListProps<T>) {
  const ids = items.map(getId)
  const key = ids.join('|')
  const [optimistic, setOptimistic] = useState<{ base: string; order: string[] } | null>(null)
  const order = optimistic?.base === key ? optimistic.order : ids
  const byId = new Map(items.map(i => [getId(i), i]))

  const refs = useRef(new Map<string, HTMLLIElement>())
  const drag = useRef<Drag | null>(null)
  const hold = useRef<{ timer: ReturnType<typeof setTimeout>; x: number; y: number } | null>(null)
  const suppressClick = useRef(false)
  const [active, setActive] = useState<{ id: string; dy: number; to: number; from: number; height: number } | null>(null)

  // enquanto arrasta, o toque não pode rolar a página (listener não passivo)
  useEffect(() => {
    const block = (e: TouchEvent) => { if (drag.current) e.preventDefault() }
    document.addEventListener('touchmove', block, { passive: false })
    return () => document.removeEventListener('touchmove', block)
  }, [])

  const scroller = (el: HTMLElement | undefined) => el?.closest('main') ?? document.scrollingElement

  function start(id: string, target: HTMLLIElement, pointerId: number, clientY: number) {
    const from = order.indexOf(id)
    const els = order.map(i => refs.current.get(i)!)
    const scroll = scroller(els[from])
    drag.current = {
      id, from, pointerId, startY: clientY, startScroll: scroll?.scrollTop ?? 0,
      tops: els.map(el => el.getBoundingClientRect().top), heights: els.map(el => el.offsetHeight),
    }
    try { target.setPointerCapture(pointerId) } catch { /* o toque já terminou */ }
    suppressClick.current = true
    navigator.vibrate?.(10)
    setActive({ id, dy: 0, to: from, from, height: els[from].offsetHeight })
  }

  function onPointerDown(id: string, e: React.PointerEvent<HTMLLIElement>) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    suppressClick.current = false
    const { currentTarget, pointerId, clientX, clientY } = e
    hold.current = { x: clientX, y: clientY, timer: setTimeout(() => { hold.current = null; start(id, currentTarget, pointerId, clientY) }, HOLD_MS) }
  }

  function targetIndex(d: Drag, dy: number) {
    const center = d.tops[d.from] + dy + d.heights[d.from] / 2
    let to = d.from
    for (let i = 0; i < d.tops.length; i++) {
      const mid = d.tops[i] + d.heights[i] / 2
      if (i > d.from && center > mid) to = i
      if (i < d.from && center < mid && to === d.from) to = i
    }
    return to
  }

  function onPointerMove(e: React.PointerEvent<HTMLLIElement>) {
    if (hold.current) {
      if (Math.abs(e.clientX - hold.current.x) > MOVE_TOLERANCE || Math.abs(e.clientY - hold.current.y) > MOVE_TOLERANCE) {
        clearTimeout(hold.current.timer); hold.current = null
      }
      return
    }
    const d = drag.current
    if (!d || e.pointerId !== d.pointerId) return
    const scroll = scroller(refs.current.get(d.id))
    if (scroll) {
      const box = scroll === document.scrollingElement ? { top: 0, bottom: window.innerHeight } : scroll.getBoundingClientRect()
      if (e.clientY < box.top + EDGE) scroll.scrollTop -= EDGE_STEP
      else if (e.clientY > box.bottom - EDGE) scroll.scrollTop += EDGE_STEP
    }
    const dy = e.clientY - d.startY + ((scroll?.scrollTop ?? 0) - d.startScroll)
    setActive({ id: d.id, dy, to: targetIndex(d, dy), from: d.from, height: d.heights[d.from] })
  }

  function onPointerEnd() {
    if (hold.current) { clearTimeout(hold.current.timer); hold.current = null }
    const d = drag.current
    drag.current = null
    if (!d || !active) { setActive(null); return }
    const to = active.to
    setActive(null)
    if (to === d.from) return
    const next = [...order]
    next.splice(to, 0, ...next.splice(d.from, 1))
    setOptimistic({ base: key, order: next })
    onReorder(next)
  }

  // quanto cada linha desliza para abrir espaço para a que está sendo arrastada
  function shift(index: number) {
    if (!active) return 0
    const { from, to, height } = active
    if (from < to && index > from && index <= to) return -height
    if (from > to && index < from && index >= to) return height
    return 0
  }

  return (
    <>
      {order.map((id, index) => {
        const item = byId.get(id)
        if (!item) return null
        const dragging = active?.id === id
        return (
          <li key={id} ref={el => { if (el) refs.current.set(id, el); else refs.current.delete(id) }}
            className={cn(
              'group/row relative touch-pan-y bg-grouped select-none [-webkit-touch-callout:none]',
              dragging ? 'z-10 scale-102 shadow-floating' : active && 'transition-transform duration-200 ease-out',
            )}
            style={{ transform: `translateY(${dragging ? active.dy : shift(index)}px)` }}
            onPointerDown={e => onPointerDown(id, e)} onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd}
            onContextMenu={e => e.preventDefault()}
            onClickCapture={e => { if (suppressClick.current) { e.preventDefault(); e.stopPropagation(); suppressClick.current = false } }}>
            {renderItem(item, dragging)}
          </li>
        )
      })}
    </>
  )
}
