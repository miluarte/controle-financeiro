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
import { cn } from '@/lib/utils'
import type { ColorToken, IconToken } from '@/lib/constants'

type SolarIcon = React.ComponentType<{ className?: string; iconStyle?: string }>

export const ICON_MAP: Record<IconToken, SolarIcon> = {
  'wallet': WalletMoneyIcon,
  'credit-card': CardIcon,
  'banknote': BanknoteIcon,
  'piggy-bank': MoneyBagIcon,
  'building': Buildings2Icon,
  'utensils': CupHotIcon,
  'car': ScooterIcon,
  'home': HomeIcon,
  'heart-pulse': HeartPulseIcon,
  'book': BookIcon,
  'gamepad-2': GamepadIcon,
  'shirt': TShirtIcon,
  'ellipsis': MenuDotsIcon,
  'briefcase': SuitcaseIcon,
  'laptop': LaptopIcon,
  'trending-up': GraphUpIcon,
  'plus-circle': AddCircleIcon,
}

// Classes completas para garantir que o Tailwind inclua no bundle
export const COLOR_CLASSES: Record<ColorToken, string> = {
  red:    'bg-red-100 text-red-600',
  orange: 'bg-orange-100 text-orange-600',
  yellow: 'bg-yellow-100 text-yellow-600',
  green:  'bg-green-100 text-green-600',
  teal:   'bg-teal-100 text-teal-600',
  blue:   'bg-blue-100 text-blue-600',
  indigo: 'bg-indigo-100 text-indigo-600',
  purple: 'bg-purple-100 text-purple-600',
  pink:   'bg-pink-100 text-pink-600',
  gray:   'bg-gray-100 text-gray-500',
}

const SIZE: Record<string, { wrap: string; icon: string }> = {
  sm: { wrap: 'size-7',  icon: 'size-3.5' },
  md: { wrap: 'size-9',  icon: 'size-4'   },
  lg: { wrap: 'size-11', icon: 'size-5'   },
}

interface TokenIconProps {
  icon: string
  color: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function TokenIcon({ icon, color, size = 'md', className }: TokenIconProps) {
  const Icon = (ICON_MAP[icon as IconToken] ?? WalletMoneyIcon) as SolarIcon
  const colorClass = COLOR_CLASSES[color as ColorToken] ?? COLOR_CLASSES.gray
  const s = SIZE[size] ?? SIZE.md

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full',
        s.wrap,
        colorClass,
        className,
      )}
    >
      <Icon className={s.icon} />
    </div>
  )
}
