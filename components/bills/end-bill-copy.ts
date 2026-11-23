import type { Bill } from '@/lib/types'

// texto da confirmação ao encerrar: série (gasto ou receita fixa) encerra; gasto único a pagar é excluído
export function endBillCopy(bill: Bill): { title: string; label: string } {
  if (!bill.recurring && bill.installmentsTotal == null) return { title: 'Excluir este gasto a pagar?', label: 'Excluir' }
  return bill.type === 'income'
    ? { title: 'Encerrar receita? Os meses recebidos continuam.', label: 'Encerrar' }
    : { title: 'Encerrar gasto fixo? Os meses pagos continuam.', label: 'Encerrar' }
}
