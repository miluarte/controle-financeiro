'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CropRect } from '@/lib/avatar'

const MAX_ZOOM = 4

interface View { zoom: number; cx: number; cy: number } // centro do recorte, em pixels da imagem

// Recorte quadrado da foto de perfil: arrastar move, pinçar (ou a roda do mouse e a barra) aproxima.
// O círculo mostra como a foto aparece no avatar; o arquivo sai quadrado.
export function PhotoCropper({ image, onCropChange }: { image: HTMLImageElement; onCropChange: (crop: CropRect) => void }) {
  const w = image.naturalWidth
  const h = image.naturalHeight
  const box = useRef<HTMLDivElement>(null)
  const [frame, setFrame] = useState(0)
  const [view, setView] = useState<View>({ zoom: 1, cx: w / 2, cy: h / 2 })
  const pointers = useRef(new Map<number, { x: number; y: number }>())

  // lado do recorte em pixels da imagem com o zoom dado; o centro fica sempre dentro da foto
  const clamp = useCallback((v: View): View => {
    const zoom = Math.min(MAX_ZOOM, Math.max(1, v.zoom))
    const half = Math.min(w, h) / zoom / 2
    return {
      zoom,
      cx: Math.min(w - half, Math.max(half, v.cx)),
      cy: Math.min(h - half, Math.max(half, v.cy)),
    }
  }, [w, h])

  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setFrame(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const size = Math.min(w, h) / view.zoom
    onCropChange({ x: view.cx - size / 2, y: view.cy - size / 2, size })
  }, [view, w, h, onCropChange])

  // pixels da tela por pixel da imagem
  const scale = frame ? (frame / Math.min(w, h)) * view.zoom : 0

  function zoomBy(factor: number) {
    setView(v => clamp({ ...v, zoom: v.zoom * factor }))
  }

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
  }

  function onPointerMove(e: React.PointerEvent) {
    const map = pointers.current
    const prev = map.get(e.pointerId)
    if (!prev || !scale) return
    const before = [...map.values()]
    map.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const after = [...map.values()]
    if (after.length === 1) {
      const dx = e.clientX - prev.x
      const dy = e.clientY - prev.y
      setView(v => clamp({ ...v, cx: v.cx - dx / scale, cy: v.cy - dy / scale }))
    } else if (after.length >= 2) {
      const dist = (p: { x: number; y: number }[]) => Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y)
      const mid = (p: { x: number; y: number }[]) => ({ x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 })
      const factor = dist(before) ? dist(after) / dist(before) : 1
      const m0 = mid(before)
      const m1 = mid(after)
      setView(v => clamp({ zoom: v.zoom * factor, cx: v.cx - (m1.x - m0.x) / scale, cy: v.cy - (m1.y - m0.y) / scale }))
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId)
  }

  return (
    <div className="space-y-4">
      <div ref={box}
        className="relative aspect-square w-full touch-none overflow-hidden rounded-3xl bg-muted select-none"
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
        onWheel={e => zoomBy(e.deltaY < 0 ? 1.08 : 1 / 1.08)}>
        {scale > 0 && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.src} alt="" draggable={false}
            className="pointer-events-none absolute top-0 left-0 max-w-none origin-top-left"
            style={{
              width: w, height: h,
              transform: `translate(${frame / 2 - view.cx * scale}px, ${frame / 2 - view.cy * scale}px) scale(${scale})`,
            }} />
        )}
        <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 size-full" aria-hidden>
          <path d="M0 0H100V100H0Z M50 0A50 50 0 1 0 50 100A50 50 0 1 0 50 0Z" fillRule="evenodd" className="fill-crop-mask" />
        </svg>
      </div>
      <input type="range" aria-label="Zoom" min={1} max={MAX_ZOOM} step={0.01} value={view.zoom}
        onChange={e => setView(v => clamp({ ...v, zoom: Number(e.target.value) }))}
        className="w-full accent-primary" />
    </div>
  )
}
