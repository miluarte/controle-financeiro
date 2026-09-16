export type AccountType = 'checking' | 'savings' | 'credit_card' | 'cash' | 'loan'

export interface Account {
  id: string
  name: string
  type: AccountType
  initialBalance: number
  currentBalance: number
  creditLimit: number | null
  closingDay: number | null
  dueDay: number | null
  institution: string | null
  availableCredit: number | null
  color: string
  icon: string
  archived: boolean
  createdAt: string
}

export type CategoryType = 'income' | 'expense'

export interface Category {
  id: string
  name: string
  type: CategoryType
  icon: string
  color: string
  isDefault: boolean
  createdAt: string
}

export type TransactionType = 'income' | 'expense' | 'transfer'

export type PaymentMethod = 'pix' | 'debit' | 'boleto' | 'ted'

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  description: string
  date: string
  accountId: string
  toAccountId: string | null
  categoryId: string | null
  installmentGroupId: string | null
  installmentNumber: number | null
  installmentTotal: number | null
  recurringGroupId: string | null
  purchaseDate: string | null
  merchant: string | null
  paymentMethod: PaymentMethod | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type RecurrenceFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'

export interface RecurringGroup {
  id: string
  type: 'income' | 'expense'
  description: string
  amount: number
  accountId: string
  categoryId: string | null
  frequency: RecurrenceFrequency
  startDate: string
  endDate: string | null
  active: boolean
  notes: string | null
  createdAt: string
}

export type InstallmentGroupStatus = 'active' | 'paid_off' | 'cancelled'

export interface InstallmentGroup {
  id: string
  description: string
  totalAmount: number
  installmentCount: number
  installmentAmount: number
  accountId: string
  categoryId: string | null
  startDate: string
  status: InstallmentGroupStatus
  paidCount: number
  createdAt: string
}

export interface BudgetGoal {
  id: string
  categoryId: string
  monthlyLimit: number
  month: string | null
  isRecurring: boolean
  createdAt: string
}

export interface MonthlySummary {
  month: string
  totalIncome: number
  totalExpense: number
  balance: number
  openingBalance: number
  closingBalance: number
  accountBalances: Record<string, number>
}

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string }
