'use client'

import {
  WalletMoneyBoldDuotoneIcon,
  CardBoldDuotoneIcon,
  BanknoteBoldDuotoneIcon,
  MoneyBagBoldDuotoneIcon,
  BuildingsBoldDuotoneIcon,
  CupHotBoldDuotoneIcon,
  ScooterBoldDuotoneIcon,
  HomeBoldDuotoneIcon,
  HeartPulseBoldDuotoneIcon,
  BookBoldDuotoneIcon,
  GamepadBoldDuotoneIcon,
  TShirtBoldDuotoneIcon,
  MenuDotsBoldDuotoneIcon,
  SuitcaseBoldDuotoneIcon,
  LaptopBoldDuotoneIcon,
  GraphUpBoldDuotoneIcon,
  AddCircleBoldDuotoneIcon,
  RepeatBoldDuotoneIcon,
  UndoLeftBoldDuotoneIcon,
  GiftBoldDuotoneIcon,
} from '@solar-icons/react'
import { cn } from '@/lib/utils'
import type { ColorToken, IconToken } from '@/lib/constants'

type SolarIcon = React.ComponentType<{ className?: string; iconStyle?: string }>

export const ICON_MAP: Record<IconToken, SolarIcon> = {
  'wallet': WalletMoneyBoldDuotoneIcon,
  'credit-card': CardBoldDuotoneIcon,
  'banknote': BanknoteBoldDuotoneIcon,
  'piggy-bank': MoneyBagBoldDuotoneIcon,
  'building': BuildingsBoldDuotoneIcon,
  'utensils': CupHotBoldDuotoneIcon,
  'car': ScooterBoldDuotoneIcon,
  'home': HomeBoldDuotoneIcon,
  'heart-pulse': HeartPulseBoldDuotoneIcon,
  'book': BookBoldDuotoneIcon,
  'gamepad-2': GamepadBoldDuotoneIcon,
  'shirt': TShirtBoldDuotoneIcon,
  'ellipsis': MenuDotsBoldDuotoneIcon,
  'briefcase': SuitcaseBoldDuotoneIcon,
  'laptop': LaptopBoldDuotoneIcon,
  'trending-up': GraphUpBoldDuotoneIcon,
  'plus-circle': AddCircleBoldDuotoneIcon,
  'repeat': RepeatBoldDuotoneIcon,
  'undo': UndoLeftBoldDuotoneIcon,
  'gift': GiftBoldDuotoneIcon,
}

// Classes completas para garantir que o Tailwind inclua no bundle
export const COLOR_CLASSES: Record<ColorToken, string> = {
  red:    'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400',
  orange: 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400',
  yellow: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400',
  green:  'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400',
  teal:   'bg-teal-100 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400',
  blue:   'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
  indigo: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400',
  purple: 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400',
  pink:   'bg-pink-100 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400',
  gray:   'bg-gray-100 text-gray-500 dark:bg-gray-500/25 dark:text-gray-300',
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
  const Icon = (ICON_MAP[icon as IconToken] ?? WalletMoneyBoldDuotoneIcon) as SolarIcon
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
