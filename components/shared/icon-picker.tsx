'use client'

import {
  Wallet,
  CreditCard,
  Banknote,
  PiggyBank,
  Building,
  Utensils,
  Car,
  Home,
  HeartPulse,
  Book,
  Gamepad2,
  Shirt,
  Ellipsis,
  Briefcase,
  Laptop,
  TrendingUp,
  PlusCircle,
  type LucideIcon,
} from 'lucide-react'
import { ICON_TOKENS, type IconToken } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface IconPickerProps {
  value: IconToken | null
  onChange: (icon: IconToken) => void
}

export const ICON_MAP: Record<IconToken, LucideIcon> = {
  wallet: Wallet,
  'credit-card': CreditCard,
  banknote: Banknote,
  'piggy-bank': PiggyBank,
  building: Building,
  utensils: Utensils,
  car: Car,
  home: Home,
  'heart-pulse': HeartPulse,
  book: Book,
  'gamepad-2': Gamepad2,
  shirt: Shirt,
  ellipsis: Ellipsis,
  briefcase: Briefcase,
  laptop: Laptop,
  'trending-up': TrendingUp,
  'plus-circle': PlusCircle,
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
