import type {
  Account, BudgetGoal, Category, InstallmentGroup, RecurringGroup, Transaction,
} from '../types'

// O banco usa snake_case; o front continua usando os tipos em camelCase de
// lib/types.ts. Estas funções fazem a conversão nos dois sentidos.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

const num = (v: unknown) => (v == null ? 0 : Number(v))
const numOrNull = (v: unknown) => (v == null ? null : Number(v))

export function toAccount(r: Row): Account {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    initialBalance: num(r.initial_balance),
    currentBalance: num(r.current_balance ?? r.initial_balance),
    creditLimit: numOrNull(r.credit_limit),
    closingDay: numOrNull(r.closing_day),
    dueDay: numOrNull(r.due_day),
    institution: r.institution ?? null,
    availableCredit: numOrNull(r.available_credit),
    color: r.color,
    icon: r.icon,
    archived: !!r.archived,
    createdAt: r.created_at,
  }
}

export function fromAccount(a: Partial<Account>): Row {
  const r: Row = {}
  if (a.name !== undefined) r.name = a.name
  if (a.type !== undefined) r.type = a.type
  if (a.initialBalance !== undefined) r.initial_balance = a.initialBalance
  if (a.creditLimit !== undefined) r.credit_limit = a.creditLimit
  if (a.closingDay !== undefined) r.closing_day = a.closingDay
  if (a.dueDay !== undefined) r.due_day = a.dueDay
  if (a.institution !== undefined) r.institution = a.institution
  if (a.color !== undefined) r.color = a.color
  if (a.icon !== undefined) r.icon = a.icon
  if (a.archived !== undefined) r.archived = a.archived
  return r
}

export function toCategory(r: Row): Category {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    icon: r.icon,
    color: r.color,
    isDefault: !!r.is_default,
    createdAt: r.created_at,
  }
}

export function fromCategory(c: Partial<Category>): Row {
  const r: Row = {}
  if (c.name !== undefined) r.name = c.name
  if (c.type !== undefined) r.type = c.type
  if (c.icon !== undefined) r.icon = c.icon
  if (c.color !== undefined) r.color = c.color
  if (c.isDefault !== undefined) r.is_default = c.isDefault
  return r
}

export function toTransaction(r: Row): Transaction {
  return {
    id: r.id,
    type: r.type,
    amount: num(r.amount),
    description: r.description ?? '',
    date: r.date,
    accountId: r.account_id,
    toAccountId: r.to_account_id ?? null,
    categoryId: r.category_id ?? null,
    installmentGroupId: r.installment_group_id ?? null,
    installmentNumber: numOrNull(r.installment_number),
    installmentTotal: numOrNull(r.installment_total),
    recurringGroupId: r.recurring_group_id ?? null,
    purchaseDate: r.purchase_date ?? null,
    merchant: r.merchant ?? null,
    paymentMethod: r.payment_method ?? null,
    paid: !!r.paid,
    notes: r.notes ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export function fromTransaction(t: Partial<Transaction>): Row {
  const r: Row = {}
  if (t.type !== undefined) r.type = t.type
  if (t.amount !== undefined) r.amount = t.amount
  if (t.description !== undefined) r.description = t.description
  if (t.date !== undefined) r.date = t.date
  if (t.accountId !== undefined) r.account_id = t.accountId
  if (t.toAccountId !== undefined) r.to_account_id = t.toAccountId || null
  if (t.categoryId !== undefined) r.category_id = t.categoryId || null
  if (t.installmentGroupId !== undefined) r.installment_group_id = t.installmentGroupId || null
  if (t.installmentNumber !== undefined) r.installment_number = t.installmentNumber
  if (t.installmentTotal !== undefined) r.installment_total = t.installmentTotal
  if (t.recurringGroupId !== undefined) r.recurring_group_id = t.recurringGroupId || null
  if (t.purchaseDate !== undefined) r.purchase_date = t.purchaseDate || null
  if (t.merchant !== undefined) r.merchant = t.merchant
  if (t.paymentMethod !== undefined) r.payment_method = t.paymentMethod
  if (t.paid !== undefined) r.paid = t.paid
  if (t.notes !== undefined) r.notes = t.notes
  return r
}

export function toInstallmentGroup(r: Row): InstallmentGroup {
  return {
    id: r.id,
    description: r.description,
    totalAmount: num(r.total_amount),
    installmentCount: num(r.installment_count),
    installmentAmount: num(r.installment_amount),
    accountId: r.account_id,
    categoryId: r.category_id ?? null,
    startDate: r.start_date,
    status: r.status,
    paidCount: num(r.paid_count),
    createdAt: r.created_at,
  }
}

export function toRecurringGroup(r: Row): RecurringGroup {
  return {
    id: r.id,
    type: r.type,
    description: r.description,
    amount: num(r.amount),
    accountId: r.account_id,
    categoryId: r.category_id ?? null,
    frequency: r.frequency,
    startDate: r.start_date,
    endDate: r.end_date ?? null,
    active: !!r.active,
    notes: r.notes ?? null,
    createdAt: r.created_at,
  }
}

export function fromRecurringGroup(g: Partial<RecurringGroup>): Row {
  const r: Row = {}
  if (g.type !== undefined) r.type = g.type
  if (g.description !== undefined) r.description = g.description
  if (g.amount !== undefined) r.amount = g.amount
  if (g.accountId !== undefined) r.account_id = g.accountId
  if (g.categoryId !== undefined) r.category_id = g.categoryId || null
  if (g.frequency !== undefined) r.frequency = g.frequency
  if (g.startDate !== undefined) r.start_date = g.startDate
  if (g.endDate !== undefined) r.end_date = g.endDate || null
  if (g.active !== undefined) r.active = g.active
  if (g.notes !== undefined) r.notes = g.notes
  return r
}

export function toBudgetGoal(r: Row): BudgetGoal {
  return {
    id: r.id,
    categoryId: r.category_id,
    monthlyLimit: num(r.monthly_limit),
    month: r.month ?? null,
    isRecurring: !!r.is_recurring,
    createdAt: r.created_at,
  }
}

export function fromBudgetGoal(g: Partial<BudgetGoal>): Row {
  const r: Row = {}
  if (g.categoryId !== undefined) r.category_id = g.categoryId
  if (g.monthlyLimit !== undefined) r.monthly_limit = g.monthlyLimit
  if (g.isRecurring !== undefined) r.is_recurring = g.isRecurring
  if (g.month !== undefined) r.month = g.isRecurring ? null : g.month
  return r
}
