'use client'

import { useState } from 'react'
import { TrashBinMinimalisticLinearIcon } from '@solar-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormRow } from '@/components/ios/form-row'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { ModalSheet } from '@/components/ios/modal-sheet'
import { CurrencyInput } from '@/components/shared/currency-input'
import { DecimalField } from '@/components/shared/decimal-field'
import { NumberField } from '@/components/shared/number-field'
import { useRefresh } from '@/hooks/use-refresh'
import { vehiclesApi } from '@/lib/api/advanced'
import type { Vehicle, VehicleMaintenance, VehicleTrip } from '@/lib/types'
import { formatCurrency, formatDate, todayIso } from '@/lib/utils'

interface VehicleSheetProps {
  open: boolean
  vehicle: Vehicle | null
  trips: VehicleTrip[]
  maintenance: VehicleMaintenance[]
  onOpenChange: (o: boolean) => void
}

// Veículo: consumo e preço do combustível, trajetos do mês e manutenção preventiva.
export function VehicleSheet({ open, vehicle, trips, maintenance, onOpenChange }: VehicleSheetProps) {
  return (
    <ModalSheet open={open} onOpenChange={onOpenChange} title={vehicle?.name ?? 'Novo veículo'} formId="vehicle-form" actionLabel="Salvar">
      {open && (
        <VehicleForm key={vehicle?.id ?? 'new'} vehicle={vehicle} onDone={() => onOpenChange(false)}
          trips={trips.filter(t => t.vehicleId === vehicle?.id)}
          maintenance={maintenance.filter(m => m.vehicleId === vehicle?.id)} />
      )}
    </ModalSheet>
  )
}

function VehicleForm({ vehicle, trips, maintenance, onDone }: {
  vehicle: Vehicle | null; trips: VehicleTrip[]; maintenance: VehicleMaintenance[]; onDone: () => void
}) {
  const refresh = useRefresh()
  const [name, setName] = useState(vehicle?.name ?? '')
  const [kmPerLiter, setKmPerLiter] = useState(vehicle?.kmPerLiter ?? 0)
  const [fuelPrice, setFuelPrice] = useState(vehicle?.fuelPrice ?? 0)
  const [tripDate, setTripDate] = useState(todayIso())
  const [tripKm, setTripKm] = useState(0)
  const [mName, setMName] = useState('')
  const [mCost, setMCost] = useState(0)
  const [mEvery, setMEvery] = useState(6)
  const [error, setError] = useState<string | null>(null)

  async function run(fn: () => Promise<void>, close = true) {
    setError(null)
    try { await fn(); await refresh(); if (close) onDone() }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível salvar.') }
  }

  function save(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Dê um nome.'); return }
    if (kmPerLiter <= 0 || fuelPrice <= 0) { setError('Informe consumo e preço do litro.'); return }
    const input = { name: name.trim(), kmPerLiter, fuelPrice }
    run(() => vehicle ? vehiclesApi.update(vehicle.id, input) : vehiclesApi.create(input))
  }

  return (
    <form id="vehicle-form" onSubmit={save} className="space-y-6">
      <ListGroup>
        <FormRow label="Nome" htmlFor="v-name">
          <Input id="v-name" variant="bare" value={name} onChange={e => setName(e.target.value)} placeholder="Carro, moto…" className="text-right" />
        </FormRow>
        <FormRow label="Km por litro" htmlFor="v-kml">
          <DecimalField id="v-kml" value={kmPerLiter} onChange={setKmPerLiter} className="w-20 text-right" />
        </FormRow>
        <FormRow label="Preço do litro" htmlFor="v-price">
          <CurrencyInput id="v-price" variant="bare" value={fuelPrice} onChange={setFuelPrice} className="text-right" />
        </FormRow>
      </ListGroup>

      {vehicle && (
        <>
          <ListGroup header="Trajetos do mês">
            <FormRow label="Data" htmlFor="t-date">
              <Input id="t-date" type="date" variant="bare" value={tripDate} onChange={e => setTripDate(e.target.value || todayIso())} className="w-auto text-right" />
            </FormRow>
            <FormRow label="Km" htmlFor="t-km">
              <DecimalField id="t-km" value={tripKm} onChange={setTripKm} className="w-20 text-right" />
            </FormRow>
            <ListRow tone="tint" title="Adicionar trajeto"
              onClick={() => { if (tripKm > 0) run(async () => { await vehiclesApi.addTrip(vehicle.id, tripDate, tripKm); setTripKm(0) }, false) }} />
            {trips.map(t => (
              <ListRow key={t.id} title={`${t.km.toLocaleString('pt-BR')} km`} subtitle={formatDate(t.date)}
                trailing={<TripDelete onClick={() => run(() => vehiclesApi.removeTrip(t.id), false)} />} />
            ))}
          </ListGroup>

          <ListGroup header="Manutenção preventiva">
            <FormRow label="Item" htmlFor="m-name">
              <Input id="m-name" variant="bare" value={mName} onChange={e => setMName(e.target.value)} placeholder="Troca de óleo" className="text-right" />
            </FormRow>
            <FormRow label="Custo" htmlFor="m-cost">
              <CurrencyInput id="m-cost" variant="bare" value={mCost} onChange={setMCost} className="text-right" />
            </FormRow>
            <FormRow label="A cada (meses)" htmlFor="m-every">
              <NumberField id="m-every" min={1} max={120} value={mEvery} onChange={setMEvery} className="w-16 text-right" />
            </FormRow>
            <ListRow tone="tint" title="Adicionar item"
              onClick={() => {
                if (mName.trim() && mCost > 0) run(async () => {
                  await vehiclesApi.addMaintenance(vehicle.id, mName.trim(), mCost, mEvery); setMName(''); setMCost(0)
                }, false)
              }} />
            {maintenance.map(m => (
              <ListRow key={m.id} title={m.name}
                subtitle={`${formatCurrency(m.cost)} a cada ${m.everyMonths} ${m.everyMonths === 1 ? 'mês' : 'meses'}`}
                trailing={<TripDelete onClick={() => run(() => vehiclesApi.removeMaintenance(m.id), false)} />} />
            ))}
          </ListGroup>
        </>
      )}

      {error && <p className="px-4 text-footnote text-destructive">{error}</p>}
      {vehicle && (
        <Button type="button" variant="ghost" size="lg" className="w-full text-destructive"
          onClick={() => { if (confirm('Excluir este veículo e os trajetos?')) run(() => vehiclesApi.remove(vehicle.id)) }}>
          Excluir veículo
        </Button>
      )}
    </form>
  )
}

function TripDelete({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="plain" size="icon" aria-label="Excluir" onClick={onClick} className="text-destructive">
      <TrashBinMinimalisticLinearIcon />
    </Button>
  )
}
