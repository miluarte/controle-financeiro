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
  type: 'expense' | 'income' | 'save_apply' | 'save_redeem'
  amount: number
  date: string
  categoryId: string | null
  walletId: string | null
  place: string | null
  description: string | null
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
