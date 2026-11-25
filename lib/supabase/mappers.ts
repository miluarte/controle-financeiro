import type {
  Bill, BillOccurrence, Category, CategorySpending, InvoiceTotal, MonthHistory, MonthSummary, OwnWallet,
  Profile, Transaction, Wallet, Goal, Institution, InstitutionRate, Subscription, SubscriptionUse, Vehicle, VehicleTrip, VehicleMaintenance,
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
    onboardingCompletedAt: r.onboarding_completed_at ?? null,
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
    ownerId: r.owner_id ?? null,
    last4: r.last4 ?? null,
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
    createdBy: r.created_by ?? null,
    owner: r.assigned_to,
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
    receiptPath: r.receipt_path ?? null,
    sourceData: r.source_data ?? null,
    prepaidBy: r.prepaid_by ?? null,
    holderId: r.holder_id ?? null,
    paidBy: r.paid_by ?? null,
    sharedPaymentId: r.shared_payment_id ?? null,
    createdAt: r.created_at ?? undefined,
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
    closed: !!r.closed,
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
    institutionId: r.institution_id ?? null,
    last4: r.last4 ?? null,
    revolvingRate: numOrNull(r.revolving_rate),
    closingDayInclusive: r.closing_day_inclusive ?? true,
    shareScope: r.share_scope ?? 'none',
  }
}

export function toBill(r: Row): Bill {
  return {
    id: r.id,
    name: r.name,
    amount: num(r.amount),
    type: r.type === 'income' ? 'income' : 'expense',
    dueDay: num(r.due_day),
    dueNextMonth: !!r.due_next_month,
    categoryId: r.category_id ?? null,
    recurring: !!r.recurring,
    startMonth: r.start_month,
    installmentCurrent: numOrNull(r.installment_current),
    installmentsTotal: numOrNull(r.installments_total),
    endMonth: r.end_month ?? null,
    active: !!r.active,
    walletId: r.wallet_id ?? null,
    // sem a carteira na leitura (cartão de outra pessoa sem acesso), vale a regra antiga: só cartão tinha carteira
    onCard: r.wallet ? r.wallet.type === 'credit' : !!r.wallet_id,
    recipient: r.recipient?.name ? { userId: r.recipient.user_id ?? null, name: r.recipient.name } : null,
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
    prepaid: num(r.prepaid),
    scheduled: num(r.scheduled),
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

export function toGoal(r: Row): Goal {
  return {
    id: r.id, name: r.name, targetAmount: num(r.target_amount), savedAmount: num(r.saved_amount),
    targetDate: r.target_date ?? null, priority: num(r.priority),
  }
}

export function toSubscription(r: Row): Subscription {
  return { id: r.id, name: r.name, monthlyAmount: num(r.monthly_amount), unitPrice: numOrNull(r.unit_price), active: !!r.active }
}

export function toSubscriptionUse(r: Row): SubscriptionUse {
  return { id: r.id, subscriptionId: r.subscription_id, usedOn: r.used_on }
}

export function toVehicle(r: Row): Vehicle {
  return { id: r.id, name: r.name, kmPerLiter: Number(r.km_per_liter), fuelPrice: num(r.fuel_price) }
}

export function toVehicleTrip(r: Row): VehicleTrip {
  return { id: r.id, vehicleId: r.vehicle_id, date: r.date, km: Number(r.km), note: r.note ?? null }
}

export function toVehicleMaintenance(r: Row): VehicleMaintenance {
  return { id: r.id, vehicleId: r.vehicle_id, name: r.name, cost: num(r.cost), everyMonths: num(r.every_months) }
}

export function toInstitution(r: Row): Institution {
  return {
    id: r.id, name: r.name, revolvingRate: numOrNull(r.revolving_rate), installmentRate: numOrNull(r.installment_rate),
    priority: num(r.priority),
    lateInterest: num(r.late_interest), lateFine: num(r.late_fine), iofDaily: num(r.iof_daily), iofAdditional: num(r.iof_additional),
  }
}

export function toInstitutionRate(r: Row): InstitutionRate {
  return {
    institutionId: r.institution_id, product: r.product, monthlyRate: Number(r.monthly_rate),
    periodStart: r.period_start, periodEnd: r.period_end,
  }
}
