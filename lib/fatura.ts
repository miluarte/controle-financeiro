import type { Transaction, Account, InstallmentGroup, RecurringGroup } from './types'

// Lógica de "o que entra na fatura do mês", compartilhada entre o gráfico
// (installment-monthly-chart) e a lista de lançamentos (installment-list).
// Antes o gráfico somava só parcelas (calculadas a partir do InstallmentGroup,
// sem olhar pra transação real) e a lista também só mostrava parcelamentos —
// faturas ficavam sem as compras únicas e as recorrências/contas fixas do
// cartão, e o valor total não tinha como bater com os cards embaixo dele
// (mesma classe de bug do gráfico de parcelas: soma calculada por um caminho
// diferente do que gera a lista).
//
// Agora os dois usam a mesma fonte (transações reais) e a mesma base de
// filtro (isCardTransactionForFatura), então total e lista sempre
// reconciliam — o total ainda soma só isCountedInFatura, que por cima disso
// exclui o que já foi marcado como pago (Transaction.paid).

export function todayIsoLocal(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export interface FaturaContext {
  cardAccountIds: Set<string>
  inactiveInstallmentGroupIds: Set<string>
  inactiveRecurringGroupIds: Set<string>
  today: string
}

export function buildFaturaContext(
  accounts: Account[],
  installmentGroups: InstallmentGroup[],
  recurringGroups: RecurringGroup[],
): FaturaContext {
  return {
    cardAccountIds: new Set(accounts.filter(a => a.type === 'credit_card').map(a => a.id)),
    inactiveInstallmentGroupIds: new Set(
      installmentGroups.filter(g => g.status !== 'active').map(g => g.id),
    ),
    inactiveRecurringGroupIds: new Set(
      recurringGroups.filter(g => !g.active).map(g => g.id),
    ),
    today: todayIsoLocal(),
  }
}

// Uma transação é candidata a aparecer na fatura de um cartão quando: é de
// uma conta do tipo cartão de crédito; não é transferência (pagamento de
// fatura reduz a dívida, não é gasto do mês, já é excluído aqui); e, se ainda
// não realizada (data no futuro) e pertence a um parcelamento já
// quitado/cancelado ou a uma recorrência já desativada, não entra — mesma
// regra que o backend usa em computeAccountBalances_ pra não comprometer o
// limite disponível com parcelas futuras de um parcelamento quitado
// antecipadamente. Parcelas e recorrências já realizadas (data <= hoje) contam
// sempre, mesmo que o grupo tenha sido quitado ou desativado depois — o gasto
// já aconteceu de verdade.
//
// Isso decide só se a transação PERTENCE à fatura daquele mês (pra fins de
// listagem) — não decide se ela ainda pesa no total em aberto, ver
// isCountedInFatura logo abaixo, que soma esta função com a checagem de
// Transaction.paid.
export function isCardTransactionForFatura(t: Transaction, ctx: FaturaContext): boolean {
  if (!ctx.cardAccountIds.has(t.accountId)) return false
  if (t.type === 'transfer') return false

  const dateStr = t.date.slice(0, 10)
  if (dateStr > ctx.today) {
    if (t.installmentGroupId && ctx.inactiveInstallmentGroupIds.has(t.installmentGroupId)) return false
    if (t.recurringGroupId && ctx.inactiveRecurringGroupIds.has(t.recurringGroupId)) return false
  }

  return true
}

// Conta no total ainda em aberto da fatura: além de ser uma transação de
// cartão pro mês (isCardTransactionForFatura), a compra não pode já ter sido
// marcada como paga manualmente (Transaction.paid). Uma compra paga continua
// aparecendo na lista da fatura (ver installment-list.tsx, que usa
// isCardTransactionForFatura direto pra não escondê-la, só com o badge
// "Paga"), só sai da soma do quanto ainda falta pagar. Importante: marcar
// como paga é só um controle manual no frontend — não mexe em currentBalance
// da conta nem substitui pagar a fatura de verdade via transferência.
export function isCountedInFatura(t: Transaction, ctx: FaturaContext): boolean {
  if (t.paid) return false
  return isCardTransactionForFatura(t, ctx)
}

export function faturaMonthOf(t: Transaction): string {
  return t.date.slice(0, 7)
}

// Estorno/reembolso (income) diminui o valor da fatura; despesa aumenta.
export function faturaSignedAmount(t: Transaction): number {
  return t.type === 'income' ? -t.amount : t.amount
}
