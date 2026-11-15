// Tipos do front no modelo da especificação v1.0 (docs/banco-de-dados.md).
// Valores monetários sempre em centavos.

export type Theme = 'light' | 'dark' | 'system'

export interface Profile {
  id: string
  name: string
  avatarColor: string
  currency: string
  theme: Theme
  carryOverBalance: boolean
  monthlyIncome: number | null
  defaultWalletId: string | null
  onboardingDismissed: boolean
}

export type WalletType = 'pix' | 'debit' | 'credit' | 'cash' | 'other'

export interface Wallet {
  id: string
  name: string
  type: WalletType
  finish: string
  closingDay: number | null
  dueDay: number | null
  active: boolean
  sortOrder: number
  // cartão de outra pessoa da família, compartilhado comigo
  ownerName: string | null
}

export type CategoryType = 'expense' | 'income'

export interface Category {
  id: string
  type: CategoryType
  name: string
  icon: string
  color: string
  class: 'essential' | 'desire' | null
  sortOrder: number
  active: boolean
}

export type TransactionType =
  | 'expense' | 'income' | 'save_apply' | 'save_redeem' | 'invoice_payment' | 'settlement_payment'

export interface Transaction {
  id: string
  type: TransactionType
  installmentGroupId: string | null
  billId: string | null
  toWalletId: string | null
  createdBy: string | null
  // de quem é a compra (5.7.5)
  owner: string
  amount: number
  date: string
  categoryId: string | null
  walletId: string | null
  walletNameSnapshot: string | null
  place: string | null
  description: string | null
  installmentN: number | null
  installmentsTotal: number | null
  invoiceRef: string | null
  source: string
  status: 'confirmed' | 'pending'
}

export interface NewTransaction {
  type: 'expense' | 'income' | 'save_apply' | 'save_redeem' | 'invoice_payment'
  amount: number
  date: string
  categoryId: string | null
  walletId: string | null
  place: string | null
  description: string | null
  source?: string
}

export interface MonthSummary {
  income: number
  spending: number
  expenseCount: number
  cashExpense: number
  saved: number
  redeemed: number
  invoicePaid: number
  balance: number
  openingBalance: number
  totalSaved: number
  budget: number | null
  receivableFromMembers: number
  pendingCount: number
}

export interface WalletInput {
  name: string
  type: WalletType
  finish: string
  closingDay: number | null
  dueDay: number | null
  spendingLimit: number | null
}

export interface OwnWallet extends Wallet {
  spendingLimit: number | null
  closingDayInclusive: boolean
  shareScope: 'none' | 'family' | 'selected'
}

export interface CategoryInput {
  type: CategoryType
  name: string
  icon: string
  color: string
  class: 'essential' | 'desire' | null
}

export interface Bill {
  id: string
  name: string
  amount: number
  dueDay: number
  dueNextMonth: boolean
  categoryId: string | null
  recurring: boolean
  startMonth: string
  installmentCurrent: number | null
  installmentsTotal: number | null
  active: boolean
}

export interface BillInput {
  name: string
  amount: number
  dueDay: number
  dueNextMonth: boolean
  categoryId: string | null
  recurring: boolean
  startMonth: string
  installmentCurrent: number | null
  installmentsTotal: number | null
}

export interface BillOccurrence {
  id: string
  billId: string
  refMonth: string
  installmentN: number | null
  amount: number
  dueDate: string
  paidAt: string | null
  transactionId: string | null
  bill: Bill
}

export interface InvoiceTotal {
  walletId: string
  invoiceRef: string
  assignedTo: string
  total: number
  purchases: number
}

export interface Invoice {
  walletId: string
  refMonth: string
  paidAt: string | null
}

export interface CategorySpending {
  categoryId: string
  name: string
  class: 'essential' | 'desire' | null
  total: number
  transactions: number
  goal: number | null
}

export interface MonthHistory {
  month: string
  spending: number
  income: number
  saved: number
}

export interface Family {
  id: string
  name: string
  code: string
  entriesPaused: boolean
}

export interface FamilyMember {
  userId: string
  name: string
  avatarColor: string
  role: 'admin' | 'member'
  status: 'pending' | 'active'
  joinedAt: string | null
}

export interface CardDebt {
  walletId: string
  invoiceRef: string
  dueDate: string
  total: number
  settled: number
  open: number
}
