'use client'

import { createContext, useContext } from 'react'

// Abre o detalhe de um lançamento de qualquer lugar do app (ex.: logo depois de registrar uma compra no +).
export const TransactionDetailContext = createContext<(id: string) => void>(() => {})

export const useShowTransaction = () => useContext(TransactionDetailContext)
