import type { Goal, MonthHistory, Subscription, Vehicle, VehicleMaintenance, VehicleTrip } from './types'
import { addMonths, currentMonth } from './utils'

// Cálculos da camada analítica. Valores em centavos.

// Poupança média: entradas menos gastos dos meses já completos (o mês atual fica de fora).
export function averageSavings(history: MonthHistory[]) {
  const now = currentMonth()
  const done = history.filter(h => h.month.slice(0, 7) < now && (h.income > 0 || h.spending > 0))
  if (!done.length) return { average: 0, months: 0 }
  const total = done.reduce((s, h) => s + (h.income - h.spending), 0)
  return { average: Math.max(0, Math.round(total / done.length)), months: done.length }
}

function monthsBetween(from: string, to: string) {
  const [fy, fm] = from.split('-').map(Number)
  const [ty, tm] = to.split('-').map(Number)
  return (ty - fy) * 12 + (tm - fm)
}

export interface GoalPlan {
  goal: Goal
  remaining: number
  // mês (AAAA-MM) em que fica pronto, com a poupança média e a fila de prioridade
  readyMonth: string | null
  // com data alvo: quanto precisa guardar por mês e quanto falta além da média
  neededPerMonth: number | null
  shortfall: number | null
}

// Objetivos simultâneos: a poupança média vai inteira para o de maior prioridade até ele
// completar; depois segue para o próximo.
export function planGoals(goals: Goal[], average: number): GoalPlan[] {
  const now = currentMonth()
  let monthsUsed = 0
  return [...goals].sort((a, b) => a.priority - b.priority).map(goal => {
    const remaining = Math.max(0, goal.targetAmount - goal.savedAmount)
    let readyMonth: string | null = null
    if (remaining === 0) readyMonth = now
    else if (average > 0) {
      monthsUsed += remaining / average
      readyMonth = addMonths(now, Math.ceil(monthsUsed))
    }
    let neededPerMonth: number | null = null
    let shortfall: number | null = null
    if (goal.targetDate && remaining > 0) {
      const months = Math.max(1, monthsBetween(now, goal.targetDate.slice(0, 7)))
      neededPerMonth = Math.ceil(remaining / months)
      shortfall = Math.max(0, neededPerMonth - average)
    }
    return { goal, remaining, readyMonth, neededPerMonth, shortfall }
  })
}

export interface SubscriptionCost {
  uses: number
  costPerUse: number | null
  // diferença para pagar avulso: positivo = a assinatura saiu mais cara
  loss: number | null
}

export function subscriptionCost(s: Subscription, uses: number): SubscriptionCost {
  const costPerUse = uses ? Math.round(s.monthlyAmount / uses) : null
  const loss = s.unitPrice != null ? s.monthlyAmount - uses * s.unitPrice : null
  return { uses, costPerUse, loss }
}

export interface VehicleCost {
  km: number
  fuel: number
  maintenance: number
  total: number
  perKm: number | null
}

// Custo do mês: combustível dos trajetos + reserva mensal da manutenção preventiva.
export function vehicleCost(v: Vehicle, trips: VehicleTrip[], maintenance: VehicleMaintenance[]): VehicleCost {
  const km = trips.filter(t => t.vehicleId === v.id).reduce((s, t) => s + t.km, 0)
  const fuel = Math.round((km / v.kmPerLiter) * v.fuelPrice)
  const upkeep = Math.round(maintenance.filter(m => m.vehicleId === v.id).reduce((s, m) => s + m.cost / m.everyMonths, 0))
  const total = fuel + upkeep
  return { km, fuel, maintenance: upkeep, total, perKm: km ? Math.round(total / km) : null }
}
