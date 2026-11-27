'use client'

import { useParams } from 'next/navigation'
import { InstallmentsScreen } from '@/components/transactions/installments-screen'

// Parcelas de uma compra parcelada, a partir do detalhe do lançamento.
export default function InstallmentsPage() {
  const { id } = useParams<{ id: string }>()
  return <InstallmentsScreen id={id} />
}
