import { redirect } from 'next/navigation'

// A lista de transações foi incorporada à tela de início (/dashboard).
// Esta rota só existe pra não quebrar links antigos.
export default function TransactionsPage() {
  redirect('/dashboard')
}
