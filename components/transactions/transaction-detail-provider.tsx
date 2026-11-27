'use client'

import { useCallback, useState } from 'react'
import { TransactionDetailContext } from './transaction-detail-context'
import { TransactionView } from './transaction-editor'

// Guarda o lançamento aberto pelo useShowTransaction e mostra o detalhe dele por cima da tela.
export function TransactionDetailProvider({ children }: { children: React.ReactNode }) {
  const [id, setId] = useState<string | null>(null)
  const close = useCallback(() => setId(null), [])
  return (
    <TransactionDetailContext.Provider value={setId}>
      {children}
      {id && <TransactionView key={id} id={id} onClose={close} />}
    </TransactionDetailContext.Provider>
  )
}
