'use client'

import {
  WalletMoneyBoldDuotoneIcon, WalletMoneyBoldIcon,
  CardBoldDuotoneIcon, CardBoldIcon,
  BanknoteBoldDuotoneIcon, BanknoteBoldIcon,
  MoneyBagBoldDuotoneIcon, MoneyBagBoldIcon,
  BuildingsBoldDuotoneIcon, BuildingsBoldIcon,
  CupHotBoldDuotoneIcon, CupHotBoldIcon,
  ScooterBoldDuotoneIcon, ScooterBoldIcon,
  HomeBoldDuotoneIcon, HomeBoldIcon,
  HeartPulseBoldDuotoneIcon, HeartPulseBoldIcon,
  BookBoldDuotoneIcon, BookBoldIcon,
  GamepadBoldDuotoneIcon, GamepadBoldIcon,
  TShirtBoldDuotoneIcon, TShirtBoldIcon,
  MenuDotsBoldDuotoneIcon, MenuDotsBoldIcon,
  SuitcaseBoldDuotoneIcon, SuitcaseBoldIcon,
  LaptopBoldDuotoneIcon, LaptopBoldIcon,
  GraphUpBoldDuotoneIcon, GraphUpBoldIcon,
  AddCircleBoldDuotoneIcon, AddCircleBoldIcon,
} from '@solar-icons/react'
import { ICON_TOKENS, type IconToken } from '@/lib/constants'
import { cn } from '@/lib/utils'

type SolarIcon = React.ComponentType<{ className?: string }>

type IconPair = { default: SolarIcon; active: SolarIcon }

export const ICON_MAP: Record<IconToken, IconPair> = {
  wallet:        { default: WalletMoneyBoldDuotoneIcon, active: WalletMoneyBoldIcon },
  'credit-card': { default: CardBoldDuotoneIcon,        active: CardBoldIcon },
  banknote:      { default: BanknoteBoldDuotoneIcon,    active: BanknoteBoldIcon },
  'piggy-bank':  { default: MoneyBagBoldDuotoneIcon,    active: MoneyBagBoldIcon },
  building:      { default: BuildingsBoldDuotoneIcon,   active: BuildingsBoldIcon },
  utensils:      { default: CupHotBoldDuotoneIcon,      active: CupHotBoldIcon },
  car:           { default: ScooterBoldDuotoneIcon,     active: ScooterBoldIcon },
  home:          { default: HomeBoldDuotoneIcon,        active: HomeBoldIcon },
  'heart-pulse': { default: HeartPulseBoldDuotoneIcon,  active: HeartPulseBoldIcon },
  book:          { default: BookBoldDuotoneIcon,        active: BookBoldIcon },
  'gamepad-2':   { default: GamepadBoldDuotoneIcon,     active: GamepadBoldIcon },
  shirt:         { default: TShirtBoldDuotoneIcon,      active: TShirtBoldIcon },
  ellipsis:      { default: MenuDotsBoldDuotoneIcon,    active: MenuDotsBoldIcon },
  briefcase:     { default: SuitcaseBoldDuotoneIcon,    active: SuitcaseBoldIcon },
  laptop:        { default: LaptopBoldDuotoneIcon,      active: LaptopBoldIcon },
  'trending-up': { default: GraphUpBoldDuotoneIcon,     active: GraphUpBoldIcon },
  'plus-circle': { default: AddCircleBoldDuotoneIcon,   active: AddCircleBoldIcon },
}

interface IconPickerProps {
  value: IconToken | null
  onChange: (icon: IconToken) => void
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {ICON_TOKENS.map(token => {
        const selected = value === token
        const Icon = selected ? ICON_MAP[token].active : ICON_MAP[token].default
        return (
          <button
            key={token}
            type="button"
            aria-label={token}
            aria-pressed={selected}
            onClick={() => onChange(token)}
            className={cn(
              'flex size-11 items-center justify-center rounded-lg border border-input bg-transparent text-muted-foreground transition-colors',
              selected && 'border-primary bg-primary/10 text-primary',
            )}
          >
            <Icon className="size-5" />
          </button>
        )
      })}
    </div>
  )
}
