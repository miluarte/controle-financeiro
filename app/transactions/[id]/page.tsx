'use client'

import { useParams } from 'next/navigation'
import { TransactionScreen } from '@/components/transactions/transaction-screen'

// Detalhe de um lançamento (abre ao tocar numa linha e logo depois de registrar no +).
export default function TransactionPage() {
  const { id } = useParams<{ id: string }>()
  return <TransactionScreen key={id} id={id} />
}
