'use client'

import { useState } from 'react'
import { AddLinearIcon } from '@solar-icons/react'
import { VehicleSheet } from '@/components/advanced/vehicle-sheet'
import { GlassButton } from '@/components/ios/glass-button'
import { LargeTitleHeader } from '@/components/ios/large-title-header'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { MonthSelector } from '@/components/shared/month-selector'
import { useVehicles } from '@/hooks/use-data'
import { useMonth } from '@/hooks/use-month'
import { vehicleCost } from '@/lib/advanced'
import { formatCurrency } from '@/lib/utils'

// Custo de deslocamento por veículo no mês. Fica fora do saldo: é estimativa.
export default function VehiclesPage() {
  const { month } = useMonth()
  const { vehicles, trips, maintenance, loading } = useVehicles(month)
  const [openId, setOpenId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const current = vehicles.find(v => v.id === openId) ?? null

  function openVehicle(id: string | null) { setOpenId(id); setOpen(true) }

  return (
    <>
      <LargeTitleHeader back title="Veículos"
        actions={<GlassButton aria-label="Novo veículo" onClick={() => openVehicle(null)}><AddLinearIcon /></GlassButton>} />
      <div className="space-y-7 px-4 pt-2">
        <div className="flex"><MonthSelector /></div>
        {loading ? (
          <p className="text-subheadline text-muted-foreground">Carregando…</p>
        ) : vehicles.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-headline">Nenhum veículo</p>
            <p className="text-subheadline text-muted-foreground">Toque no + para criar</p>
          </div>
        ) : (
          <ListGroup header="Custo estimado no mês" footer="Estimativa. Não entra no saldo.">
            {vehicles.map(v => {
              const c = vehicleCost(v, trips, maintenance)
              const perKm = c.perKm != null ? ` · ${formatCurrency(c.perKm)}/km` : ''
              const detail = `Comb. ${formatCurrency(c.fuel)} · manut. ${formatCurrency(c.maintenance)}`
              return (
                <ListRow key={v.id} onClick={() => openVehicle(v.id)} chevron
                  title={v.name}
                  subtitle={<>{c.km.toLocaleString('pt-BR')} km{perKm}<br />{detail}</>}
                  trailing={<span className="text-body font-semibold tabular-nums text-foreground">{formatCurrency(c.total)}</span>} />
              )
            })}
          </ListGroup>
        )}
      </div>
      <VehicleSheet open={open} vehicle={current} trips={trips} maintenance={maintenance} onOpenChange={setOpen} />
    </>
  )
}
