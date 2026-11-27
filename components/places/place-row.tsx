'use client'

import { AltArrowRightLinearIcon, GlobalLinearIcon, MapPointLinearIcon, TagLinearIcon } from '@solar-icons/react'
import { SwipeActions } from '@/components/ios/swipe-actions'
import { ICON_MAP } from '@/components/shared/token-icon'
import { Badge } from '@/components/ui/badge'
import type { IconToken } from '@/lib/constants'

type SolarIcon = React.ComponentType<{ className?: string }>

// Linha de informação do local: ícone pequeno e texto cinza, numa linha só com reticências.
function PlaceMeta({ icon: Icon, children }: { icon: SolarIcon; children: React.ReactNode }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-subheadline text-muted-foreground">
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{children}</span>
    </span>
  )
}

// Linha da lista de Locais (2026-11-27, aprovada pela Milena): nome da maquininha, marca (etiqueta),
// endereço (alfinete) ou Loja online (globo) e, por último, a categoria num selo cinza com o ícone dela.
// Só aparece o que estiver preenchido.
export function PlaceRow({ name, brand, address, online, category, onClick, onDelete }: {
  name: string
  brand?: string | null
  address?: string | null
  online?: boolean
  category?: { name: string; icon: string } | null
  onClick: () => void
  onDelete?: () => void
}) {
  const CategoryGlyph = category ? (ICON_MAP[category.icon as IconToken] as SolarIcon | undefined) : undefined
  const row = (
    <button type="button" onClick={onClick}
      className="flex min-h-row w-full items-center gap-3 pl-4 text-left text-body text-foreground transition-colors active:bg-fill">
      <span className="flex min-w-0 flex-1 items-center gap-2 self-stretch border-b border-separator py-3 pr-4 group-last/row:border-b-0">
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate font-semibold">{name}</span>
          {brand && <PlaceMeta icon={TagLinearIcon}>{brand}</PlaceMeta>}
          {online ? <PlaceMeta icon={GlobalLinearIcon}>Loja online</PlaceMeta>
            : address && <PlaceMeta icon={MapPointLinearIcon}>{address}</PlaceMeta>}
          {category && (
            <Badge variant="secondary" className="mt-1 max-w-full">
              {CategoryGlyph && <CategoryGlyph />}
              <span className="truncate">{category.name}</span>
            </Badge>
          )}
        </span>
        <AltArrowRightLinearIcon className="size-4 shrink-0 stroke-(length:--icon-stroke-chevron) text-muted-foreground" />
      </span>
    </button>
  )
  return <li className="group/row">{onDelete ? <SwipeActions onDelete={onDelete}>{row}</SwipeActions> : row}</li>
}
