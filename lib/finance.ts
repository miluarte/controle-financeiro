import type { CreditProduct } from './types'

// Fórmulas de crédito usadas no simulador. Valores em centavos, taxas em % ao mês.
// IOF pessoa física: 0,38% fixo + 0,0082% ao dia (no máximo 365 dias) sobre o valor emprestado.

export const PRODUCT_LABEL: Record<CreditProduct, string> = {
  personal_loan: 'Empréstimo pessoal',
  payroll_inss: 'Consignado INSS',
  payroll_private: 'Consignado privado',
  payroll_public: 'Consignado público',
  overdraft: 'Cheque especial',
  card_revolving: 'Rotativo do cartão',
  card_installment: 'Parcelamento da fatura',
  vehicle: 'Financiamento de veículo',
  other_goods: 'Financiamento de bens',
}

// Rotativo e cheque especial são cobrados por dia; os outros têm parcelas fixas (Tabela Price).
export const BY_DAYS: CreditProduct[] = ['card_revolving', 'overdraft']

const IOF_FIXED = 0.38
const IOF_DAILY = 0.0082

export interface CreditResult {
  installment: number | null // parcela (Price)
  interest: number
  iof: number
  total: number              // tudo que sai do bolso
}

// Tabela Price: parcela = P · i / (1 − (1 + i)^−n). IOF diário sobre o que amortiza em cada parcela.
export function priceLoan(amount: number, ratePct: number, months: number): CreditResult {
  const i = ratePct / 100
  const pmt = i === 0 ? amount / months : (amount * i) / (1 - Math.pow(1 + i, -months))
  let balance = amount
  let iof = amount * IOF_FIXED / 100
  for (let k = 1; k <= months; k++) {
    const amort = pmt - balance * i
    iof += amort * IOF_DAILY / 100 * Math.min(30 * k, 365)
    balance -= amort
  }
  const total = pmt * months + iof
  return { installment: Math.round(pmt), interest: Math.round(pmt * months - amount), iof: Math.round(iof), total: Math.round(total) }
}

// Rotativo e cheque especial: juros compostos pro rata dia, IOF diário. Pela Lei 14.690/2023,
// juros e encargos do cartão não passam de 100% da dívida.
export function revolvingDebt(amount: number, ratePct: number, days: number, capped = true): CreditResult {
  const interestRaw = amount * (Math.pow(1 + ratePct / 100, days / 30) - 1)
  const iofRaw = amount * (IOF_FIXED + IOF_DAILY * Math.min(days, 365)) / 100
  const scale = capped && interestRaw + iofRaw > amount ? amount / (interestRaw + iofRaw) : 1
  const interest = Math.round(interestRaw * scale)
  const iof = Math.round(iofRaw * scale)
  return { installment: null, interest, iof, total: amount + interest + iof }
}
