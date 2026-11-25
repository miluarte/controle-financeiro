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
  onboardingCompletedAt: string | null
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
  // titular do cartão (eu, nas minhas carteiras)
  ownerId: string | null
  last4?: string | null
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
  receiptPath: string | null
  sourceData: Record<string, unknown> | null
  // pagamento antecipado desta compra (antes da fatura)
  prepaidBy: string | null
  // titular do cartão quando a compra ainda não tem cartão definido (pendente)
  holderId: string | null
  // Pix dividido: quem pagou (o dinheiro saiu dela) e o Pix a que esta parte pertence
  paidBy: string | null
  sharedPaymentId: string | null
  // quando foi registrado (ordem de "Últimas transações")
  createdAt?: string
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
  sourceData?: Record<string, unknown> | null
  receiptPath?: string | null
  status?: 'confirmed' | 'pending'
  holderId?: string | null
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
  closed: boolean
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
  institutionId?: string | null
  last4?: string | null
  revolvingRate?: number | null
}

export interface OwnWallet extends Wallet {
  spendingLimit: number | null
  institutionId: string | null
  last4: string | null
  // juros do rotativo da fatura do cliente, % ao mês (vence o da instituição)
  revolvingRate: number | null
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

export type BillType = 'expense' | 'income'

export interface Bill {
  id: string
  type: BillType
  name: string
  amount: number
  dueDay: number
  dueNextMonth: boolean
  categoryId: string | null
  recurring: boolean
  startMonth: string
  installmentCurrent: number | null
  installmentsTotal: number | null
  endMonth: string | null
  active: boolean
  // forma de pagamento: no cartão de crédito é lançado sozinho na fatura (onCard); nas outras, sugerida ao pagar
  walletId: string | null
  onCard: boolean
  // destinatário do Pix (alguém da família ou outro nome); vai para o gasto ao pagar
  recipient: BillRecipient | null
}

export interface BillRecipient { userId: string | null; name: string }

export interface BillInput {
  type: BillType
  endMonth: string | null
  name: string
  amount: number
  dueDay: number
  dueNextMonth: boolean
  categoryId: string | null
  recurring: boolean
  startMonth: string
  installmentCurrent: number | null
  installmentsTotal: number | null
  walletId?: string | null
  recipient?: BillRecipient | null
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
  // compras desta fatura já pagas antes (antecipadas)
  prepaid: number
  // gastos fixos já lançados com data futura (ainda não cobrados no cartão)
  scheduled: number
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
  // pessoa sem o app (convidada pelo titular para receber compras)
  isGuest?: boolean
}

export interface CardDebt {
  walletId: string
  invoiceRef: string
  dueDate: string
  total: number
  settled: number
  open: number
  // informado pelo membro e ainda não confirmado pelo titular
  reported: number
  // dia em que o membro pagou (acerto aguardando)
  reportedPaidOn: string | null
}

export interface Settlement {
  id: string
  // fatura de cartão (walletId + invoiceRef) ou Pix dividido (sharedPaymentId)
  walletId: string | null
  debtorId: string
  holderId: string
  invoiceRef: string | null
  sharedPaymentId: string | null
  amount: number
  status: 'open' | 'reported' | 'confirmed'
  reportedAt: string | null
  confirmedAt: string | null
  // dia em que o membro pagou a titular
  paidOn: string | null
}

// Pix dividido: o que uma pessoa (debtorId) deve a quem pagou (payerId) num Pix.
export interface SharedDebt {
  sharedPaymentId: string
  payerId: string
  debtorId: string
  createdBy: string | null
  place: string | null
  date: string
  // total do Pix e a parte desta pessoa
  total: number
  part: number
  settled: number
  reported: number
  open: number
  reportedPaidOn: string | null
}

// Parte de cada pessoa num Pix dividido (quem pagou também aparece, com open 0)
export interface SharedPart { userId: string; part: number; settled: number; open: number }

export interface MonthlyClosing {
  refMonth: string
  openingBalance: number
  closingBalance: number
}

// Camada analítica (fora do fluxo de caixa)
export interface Goal {
  id: string
  name: string
  targetAmount: number
  savedAmount: number
  targetDate: string | null
  priority: number
}

export interface Subscription {
  id: string
  name: string
  monthlyAmount: number
  unitPrice: number | null
  active: boolean
}

export interface SubscriptionUse {
  id: string
  subscriptionId: string
  usedOn: string
}

export interface Vehicle {
  id: string
  name: string
  kmPerLiter: number
  fuelPrice: number
}

export interface VehicleTrip {
  id: string
  vehicleId: string
  date: string
  km: number
  note: string | null
}

export interface VehicleMaintenance {
  id: string
  vehicleId: string
  name: string
  cost: number
  everyMonths: number
}

// Banco ou instituição do cartão, com as regras de atraso (percentuais).
export interface Institution {
  id: string
  name: string
  revolvingRate: number | null
  installmentRate: number | null
  priority: number
  lateInterest: number
  lateFine: number
  iofDaily: number
  iofAdditional: number
}

export type CreditProduct = 'card_revolving' | 'card_installment' | 'overdraft' | 'personal_loan'
  | 'payroll_inss' | 'payroll_private' | 'payroll_public' | 'vehicle' | 'other_goods'

// Taxa média do banco no Banco Central (semana mais recente), % ao mês.
export interface InstitutionRate {
  institutionId: string
  product: CreditProduct
  monthlyRate: number
  periodStart: string
  periodEnd: string
}
