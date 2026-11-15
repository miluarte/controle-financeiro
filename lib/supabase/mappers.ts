import type {
  Bill, BillOccurrence, Category, CategorySpending, InvoiceTotal, MonthHistory, MonthSummary, OwnWallet,
  Profile, Transaction, Wallet,
} from '../types'

// Banco em snake_case, front em camelCase (lib/types.ts).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

const num = (v: unknown) => (v == null ? 0 : Number(v))
const numOrNull = (v: unknown) => (v == null ? null : Number(v))

export function toProfile(r: Row): Profile {
  return {
    id: r.id,
    name: r.name ?? '',
    avatarColor: r.avatar_color,
    currency: r.currency,
    theme: r.theme,
    carryOverBalance: !!r.carry_over_balance,
    monthlyIncome: numOrNull(r.monthly_income),
    defaultWalletId: r.default_wallet_id ?? null,
    onboardingDismissed: !!r.onboarding_dismissed,
  }
}

export function toWallet(r: Row): Wallet {
  return {
    id: r.id,
    name: r.name,
    type: r.type ?? 'credit',
    finish: r.finish,
    closingDay: numOrNull(r.closing_day),
    dueDay: numOrNull(r.due_day),
    active: r.active ?? true,
    sortOrder: num(r.sort_order),
    ownerName: r.owner_name ?? null,
  }
}

export function toCategory(r: Row): Category {
  return {
    id: r.id,
    type: r.type,
    name: r.name,
    icon: r.icon,
    color: r.color,
    class: r.class ?? null,
    sortOrder: num(r.sort_order),
    active: !!r.active,
  }
}

export function toTransaction(r: Row): Transaction {
  return {
    id: r.id,
    type: r.type,
    installmentGroupId: r.installment_group_id ?? null,
    billId: r.bill_id ?? null,
    toWalletId: r.to_wallet_id ?? null,
    amount: num(r.amount),
    date: r.date,
    categoryId: r.category_id ?? null,
    walletId: r.wallet_id ?? null,
    walletNameSnapshot: r.wallet_name_snapshot ?? null,
    place: r.place ?? null,
    description: r.description ?? null,
    installmentN: numOrNull(r.installment_n),
    installmentsTotal: numOrNull(r.installments_total),
    invoiceRef: r.invoice_ref ?? null,
    source: r.source,
    status: r.status,
  }
}

export function toMonthSummary(r: Row): MonthSummary {
  return {
    income: num(r.income),
    spending: num(r.spending),
    expenseCount: num(r.expense_count),
    cashExpense: num(r.cash_expense),
    saved: num(r.saved),
    redeemed: num(r.redeemed),
    invoicePaid: num(r.invoice_paid),
    balance: num(r.balance),
    openingBalance: num(r.opening_balance),
    totalSaved: num(r.total_saved),
    budget: numOrNull(r.budget),
    receivableFromMembers: num(r.receivable_from_members),
    pendingCount: num(r.pending_count),
  }
}

export function toOwnWallet(r: Row): OwnWallet {
  return {
    ...toWallet(r),
    spendingLimit: numOrNull(r.spending_limit),
    closingDayInclusive: r.closing_day_inclusive ?? true,
  }
}

export function toBill(r: Row): Bill {
  return {
    id: r.id,
    name: r.name,
    amount: num(r.amount),
    dueDay: num(r.due_day),
    dueNextMonth: !!r.due_next_month,
    categoryId: r.category_id ?? null,
    recurring: !!r.recurring,
    startMonth: r.start_month,
    installmentCurrent: numOrNull(r.installment_current),
    installmentsTotal: numOrNull(r.installments_total),
    active: !!r.active,
  }
}

export function toBillOccurrence(r: Row): BillOccurrence {
  return {
    id: r.id,
    billId: r.bill_id,
    refMonth: r.ref_month,
    installmentN: numOrNull(r.installment_n),
    amount: num(r.amount),
    dueDate: r.due_date,
    paidAt: r.paid_at ?? null,
    transactionId: r.transaction_id ?? null,
    bill: toBill(r.bills),
  }
}

export function toInvoiceTotal(r: Row): InvoiceTotal {
  return {
    walletId: r.wallet_id,
    invoiceRef: r.invoice_ref,
    assignedTo: r.assigned_to,
    total: num(r.total),
    purchases: num(r.purchases),
  }
}

export function toCategorySpending(r: Row): CategorySpending {
  return {
    categoryId: r.category_id,
    name: r.name,
    class: r.class ?? null,
    total: num(r.total),
    transactions: num(r.transactions),
    goal: numOrNull(r.goal),
  }
}

export function toMonthHistory(r: Row): MonthHistory {
  return { month: r.month, spending: num(r.spending), income: num(r.income), saved: num(r.saved) }
}
