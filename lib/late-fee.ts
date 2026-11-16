import type { Institution, OwnWallet } from './types'

// Estimativa do custo de atrasar a fatura do cartão. Valores em centavos, taxas em %.
// Multa (até 2%) e IOF (0,38% + 0,0082% ao dia) são de lei; juros de mora costuma ser 1% a.m.;
// o rotativo varia por banco e cliente (vem da fatura). Pela Lei 14.690/2023, juros e encargos
// não passam de 100% da dívida.
export interface LateRules {
  revolving: number | null
  lateInterest: number
  lateFine: number
  iofDaily: number
  iofAdditional: number
}

export const LEGAL_DEFAULTS: LateRules = { revolving: null, lateInterest: 1, lateFine: 2, iofDaily: 0.0082, iofAdditional: 0.38 }

export function lateRules(wallet: OwnWallet, institution: Institution | undefined): LateRules {
  return {
    revolving: wallet.revolvingRate ?? institution?.revolvingRate ?? null,
    lateInterest: institution?.lateInterest ?? LEGAL_DEFAULTS.lateInterest,
    lateFine: institution?.lateFine ?? LEGAL_DEFAULTS.lateFine,
    iofDaily: institution?.iofDaily ?? LEGAL_DEFAULTS.iofDaily,
    iofAdditional: institution?.iofAdditional ?? LEGAL_DEFAULTS.iofAdditional,
  }
}

export interface LateCost {
  fine: number
  interest: number
  iof: number
  total: number
}

export function lateCost(amount: number, days: number, r: LateRules): LateCost {
  const months = days / 30
  const fine = amount * r.lateFine / 100
  const mora = amount * (r.lateInterest / 100) * months
  const revolving = r.revolving != null ? amount * (Math.pow(1 + r.revolving / 100, months) - 1) : 0
  const iof = amount * (r.iofAdditional + r.iofDaily * Math.min(days, 365)) / 100
  const charges = Math.min(fine + mora + revolving + iof, amount)
  const scale = charges / (fine + mora + revolving + iof || 1)
  return {
    fine: Math.round(fine * scale),
    interest: Math.round((mora + revolving) * scale),
    iof: Math.round(iof * scale),
    total: Math.round(amount + charges),
  }
}

export function daysBetween(from: string, to: string) {
  return Math.round((new Date(`${to}T12:00:00`).getTime() - new Date(`${from}T12:00:00`).getTime()) / 86400000)
}
