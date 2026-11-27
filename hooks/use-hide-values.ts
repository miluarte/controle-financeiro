'use client'

import { useSyncExternalStore } from 'react'

// Valores ocultos no Início (olho do card de saldo). Sempre ocultos ao abrir o app; a escolha vale só
// enquanto o app está aberto (navegar entre telas mantém) e não é gravada no aparelho.
// Compartilhado entre o card de saldo e o link da análise do mês.
let hidden = true
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const HIDDEN_MONEY = 'R$ ••••'

export function useHideValues() {
  const value = useSyncExternalStore(subscribe, () => hidden, () => true)
  function toggle() {
    hidden = !hidden
    listeners.forEach(l => l())
  }
  return { hidden: value, toggle }
}
