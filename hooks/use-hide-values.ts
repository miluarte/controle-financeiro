'use client'

import { useSyncExternalStore } from 'react'

const KEY = 'troco:hide-balance'
const listeners = new Set<() => void>()

function read() {
  try { return localStorage.getItem(KEY) === '1' } catch { return false }
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

// Ocultar valores do Início: o olho fica no cabeçalho e os números no resumo, então o estado é compartilhado.
export function useHideValues() {
  const hidden = useSyncExternalStore(subscribe, read, () => false)
  function toggle() {
    try { localStorage.setItem(KEY, hidden ? '0' : '1') } catch {}
    listeners.forEach(fn => fn())
  }
  return { hidden, toggle }
}
