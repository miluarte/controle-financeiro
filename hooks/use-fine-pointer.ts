'use client'

import { useSyncExternalStore } from 'react'

// true com mouse/trackpad (desktop). No celular (toque) os seletores nativos continuam.
const QUERY = '(pointer: fine)'
const subscribe = (cb: () => void) => {
  const m = window.matchMedia(QUERY)
  m.addEventListener('change', cb)
  return () => m.removeEventListener('change', cb)
}

export function useFinePointer() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false)
}
