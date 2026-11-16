import type { Goal, Subscription, Vehicle, VehicleMaintenance, VehicleTrip } from '../types'
import { supabase, unwrap } from '../supabase/client'
import {
  toGoal, toSubscription, toSubscriptionUse, toVehicle, toVehicleMaintenance, toVehicleTrip,
} from '../supabase/mappers'

// Camada analítica: objetivos, assinaturas e veículos. Nada aqui gera lançamento.

type GoalInput = Omit<Goal, 'id'>
type SubscriptionInput = Omit<Subscription, 'id'>
type VehicleInput = Omit<Vehicle, 'id'>

const goalRow = (g: Partial<GoalInput>) => ({
  ...(g.name !== undefined && { name: g.name }),
  ...(g.targetAmount !== undefined && { target_amount: g.targetAmount }),
  ...(g.savedAmount !== undefined && { saved_amount: g.savedAmount }),
  ...(g.targetDate !== undefined && { target_date: g.targetDate }),
  ...(g.priority !== undefined && { priority: g.priority }),
})

const subscriptionRow = (s: Partial<SubscriptionInput>) => ({
  ...(s.name !== undefined && { name: s.name }),
  ...(s.monthlyAmount !== undefined && { monthly_amount: s.monthlyAmount }),
  ...(s.unitPrice !== undefined && { unit_price: s.unitPrice }),
  ...(s.active !== undefined && { active: s.active }),
})

const vehicleRow = (v: Partial<VehicleInput>) => ({
  ...(v.name !== undefined && { name: v.name }),
  ...(v.kmPerLiter !== undefined && { km_per_liter: v.kmPerLiter }),
  ...(v.fuelPrice !== undefined && { fuel_price: v.fuelPrice }),
})

export const goalsApi = {
  list: async () => unwrap(await supabase.from('goals').select('*').order('priority').order('created_at')).map(toGoal),
  create: async (g: GoalInput) => { unwrap(await supabase.from('goals').insert(goalRow(g))) },
  update: async (id: string, g: Partial<GoalInput>) => { unwrap(await supabase.from('goals').update(goalRow(g)).eq('id', id)) },
  remove: async (id: string) => { unwrap(await supabase.from('goals').delete().eq('id', id)) },
}

export const subscriptionsApi = {
  list: async () => unwrap(await supabase.from('subscriptions').select('*').order('created_at')).map(toSubscription),
  uses: async (from: string, to: string) =>
    unwrap(await supabase.from('subscription_uses').select('*').gte('used_on', from).lte('used_on', to)).map(toSubscriptionUse),
  create: async (s: SubscriptionInput) => { unwrap(await supabase.from('subscriptions').insert(subscriptionRow(s))) },
  update: async (id: string, s: Partial<SubscriptionInput>) => {
    unwrap(await supabase.from('subscriptions').update(subscriptionRow(s)).eq('id', id))
  },
  remove: async (id: string) => { unwrap(await supabase.from('subscriptions').delete().eq('id', id)) },
  // marca ou desmarca o uso num dia
  toggleUse: async (subscriptionId: string, date: string, used: boolean) => {
    if (used) unwrap(await supabase.from('subscription_uses').upsert({ subscription_id: subscriptionId, used_on: date }, { onConflict: 'subscription_id,used_on' }))
    else unwrap(await supabase.from('subscription_uses').delete().eq('subscription_id', subscriptionId).eq('used_on', date))
  },
}

export const vehiclesApi = {
  list: async () => unwrap(await supabase.from('vehicles').select('*').order('created_at')).map(toVehicle),
  trips: async (from: string, to: string): Promise<VehicleTrip[]> =>
    unwrap(await supabase.from('vehicle_trips').select('*').gte('date', from).lte('date', to).order('date', { ascending: false })).map(toVehicleTrip),
  maintenance: async (): Promise<VehicleMaintenance[]> =>
    unwrap(await supabase.from('vehicle_maintenance').select('*').order('name')).map(toVehicleMaintenance),
  create: async (v: VehicleInput) => { unwrap(await supabase.from('vehicles').insert(vehicleRow(v))) },
  update: async (id: string, v: Partial<VehicleInput>) => { unwrap(await supabase.from('vehicles').update(vehicleRow(v)).eq('id', id)) },
  remove: async (id: string) => { unwrap(await supabase.from('vehicles').delete().eq('id', id)) },
  addTrip: async (vehicleId: string, date: string, km: number) => {
    unwrap(await supabase.from('vehicle_trips').insert({ vehicle_id: vehicleId, date, km }))
  },
  removeTrip: async (id: string) => { unwrap(await supabase.from('vehicle_trips').delete().eq('id', id)) },
  addMaintenance: async (vehicleId: string, name: string, cost: number, everyMonths: number) => {
    unwrap(await supabase.from('vehicle_maintenance').insert({ vehicle_id: vehicleId, name, cost, every_months: everyMonths }))
  },
  removeMaintenance: async (id: string) => { unwrap(await supabase.from('vehicle_maintenance').delete().eq('id', id)) },
}
