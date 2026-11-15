'use client'

import {
  WalletMoneyLinearIcon,
  CardLinearIcon,
  BanknoteLinearIcon,
  MoneyBagLinearIcon,
  BuildingsLinearIcon,
  CupHotLinearIcon,
  ScooterLinearIcon,
  HomeLinearIcon,
  HeartPulseLinearIcon,
  BookLinearIcon,
  GamepadLinearIcon,
  TShirtLinearIcon,
  MenuDotsLinearIcon,
  SuitcaseLinearIcon,
  LaptopLinearIcon,
  GraphUpLinearIcon,
  AddCircleLinearIcon,
  RepeatLinearIcon,
  UndoLeftLinearIcon,
  GiftLinearIcon,
  WalletMoneyBoldIcon,
  CardBoldIcon,
  BanknoteBoldIcon,
  MoneyBagBoldIcon,
  BuildingsBoldIcon,
  CupHotBoldIcon,
  ScooterBoldIcon,
  HomeBoldIcon,
  HeartPulseBoldIcon,
  BookBoldIcon,
  GamepadBoldIcon,
  TShirtBoldIcon,
  MenuDotsBoldIcon,
  SuitcaseBoldIcon,
  LaptopBoldIcon,
  GraphUpBoldIcon,
  AddCircleBoldIcon,
  RepeatBoldIcon,
  UndoLeftBoldIcon,
  GiftBoldIcon,
} from '@solar-icons/react'
import { cn } from '@/lib/utils'
import type { ColorToken, IconToken } from '@/lib/constants'

type SolarIcon = React.ComponentType<{ className?: string; iconStyle?: string }>

export const ICON_MAP: Record<IconToken, SolarIcon> = {
  'wallet': WalletMoneyLinearIcon,
  'credit-card': CardLinearIcon,
  'banknote': BanknoteLinearIcon,
  'piggy-bank': MoneyBagLinearIcon,
  'building': BuildingsLinearIcon,
  'utensils': CupHotLinearIcon,
  'car': ScooterLinearIcon,
  'home': HomeLinearIcon,
  'heart-pulse': HeartPulseLinearIcon,
  'book': BookLinearIcon,
  'gamepad-2': GamepadLinearIcon,
  'shirt': TShirtLinearIcon,
  'ellipsis': MenuDotsLinearIcon,
  'briefcase': SuitcaseLinearIcon,
  'laptop': LaptopLinearIcon,
  'trending-up': GraphUpLinearIcon,
  'plus-circle': AddCircleLinearIcon,
  'repeat': RepeatLinearIcon,
  'undo': UndoLeftLinearIcon,
  'gift': GiftLinearIcon,
}

// Variante preenchida, para item selecionado (regra do projeto: ativo = Bold)
export const ICON_MAP_ACTIVE: Record<IconToken, SolarIcon> = {
  'wallet': WalletMoneyBoldIcon,
  'credit-card': CardBoldIcon,
  'banknote': BanknoteBoldIcon,
  'piggy-bank': MoneyBagBoldIcon,
  'building': BuildingsBoldIcon,
  'utensils': CupHotBoldIcon,
  'car': ScooterBoldIcon,
  'home': HomeBoldIcon,
  'heart-pulse': HeartPulseBoldIcon,
  'book': BookBoldIcon,
  'gamepad-2': GamepadBoldIcon,
  'shirt': TShirtBoldIcon,
  'ellipsis': MenuDotsBoldIcon,
  'briefcase': SuitcaseBoldIcon,
  'laptop': LaptopBoldIcon,
  'trending-up': GraphUpBoldIcon,
  'plus-circle': AddCircleBoldIcon,
  'repeat': RepeatBoldIcon,
  'undo': UndoLeftBoldIcon,
  'gift': GiftBoldIcon,
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
  active?: boolean
  className?: string
}

export function TokenIcon({ icon, color, size = 'md', active, className }: TokenIconProps) {
  const map = active ? ICON_MAP_ACTIVE : ICON_MAP
  const Icon = (map[icon as IconToken] ?? WalletMoneyLinearIcon) as SolarIcon
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
