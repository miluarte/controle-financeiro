'use client'

import {
  WalletMoneyIcon,
  CardIcon,
  BanknoteIcon,
  MoneyBagIcon,
  Buildings2Icon,
  CupHotIcon,
  ScooterIcon,
  HomeIcon,
  HeartPulseIcon,
  BookIcon,
  GamepadIcon,
  TShirtIcon,
  MenuDotsIcon,
  SuitcaseIcon,
  LaptopIcon,
  GraphUpIcon,
  AddCircleIcon,
} from '@solar-icons/react'
import { ICON_TOKENS, type IconToken } from '@/lib/constants'
import { cn } from '@/lib/utils'

type SolarIcon = React.ComponentType<{ className?: string; iconStyle?: string }>

export const ICON_MAP: Record<IconToken, SolarIcon> = {
  wallet: WalletMoneyIcon,
  'credit-card': CardIcon,
  banknote: BanknoteIcon,
  'piggy-bank': MoneyBagIcon,
  building: Buildings2Icon,
  utensils: CupHotIcon,
  car: ScooterIcon,
  home: HomeIcon,
  'heart-pulse': HeartPulseIcon,
  book: BookIcon,
  'gamepad-2': GamepadIcon,
  shirt: TShirtIcon,
  ellipsis: MenuDotsIcon,
  briefcase: SuitcaseIcon,
  laptop: LaptopIcon,
  'trending-up': GraphUpIcon,
  'plus-circle': AddCircleIcon,
}

interface IconPickerProps {
  value: IconToken | null
  onChange: (icon: IconToken) => void
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {ICON_TOKENS.map(token => {
        const Icon = ICON_MAP[token]
        return (
          <button
            key={token}
            type="button"
            aria-label={token}
            aria-pressed={value === token}
            onClick={() => onChange(token)}
            className={cn(
              'flex size-11 items-center justify-center rounded-lg border border-input bg-transparent text-muted-foreground transition-colors',
              value === token && 'border-primary bg-primary/10 text-primary',
            )}
          >
            <Icon className="size-5" />
          </button>
        )
      })}
    </div>
  )
}
