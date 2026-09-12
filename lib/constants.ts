import type { Category } from './types'

export const DEFAULT_CATEGORIES: Omit<Category, 'id' | 'createdAt'>[] = [
  // Despesas
  { name: 'Alimentação', type: 'expense', icon: 'utensils', color: 'orange', isDefault: true },
  { name: 'Transporte', type: 'expense', icon: 'car', color: 'blue', isDefault: true },
  { name: 'Moradia', type: 'expense', icon: 'home', color: 'green', isDefault: true },
  { name: 'Saúde', type: 'expense', icon: 'heart-pulse', color: 'red', isDefault: true },
  { name: 'Educação', type: 'expense', icon: 'book', color: 'purple', isDefault: true },
  { name: 'Lazer', type: 'expense', icon: 'gamepad-2', color: 'pink', isDefault: true },
  { name: 'Vestuário', type: 'expense', icon: 'shirt', color: 'yellow', isDefault: true },
  { name: 'Outros', type: 'expense', icon: 'ellipsis', color: 'gray', isDefault: true },
  // Receitas
  { name: 'Salário', type: 'income', icon: 'briefcase', color: 'green', isDefault: true },
  { name: 'Freelance', type: 'income', icon: 'laptop', color: 'blue', isDefault: true },
  { name: 'Investimentos', type: 'income', icon: 'trending-up', color: 'purple', isDefault: true },
  { name: 'Outros', type: 'income', icon: 'plus-circle', color: 'gray', isDefault: true },
]

export const COLOR_TOKENS = [
  'red', 'orange', 'yellow', 'green', 'teal', 'blue', 'indigo', 'purple', 'pink', 'gray',
] as const

export const ICON_TOKENS = [
  'wallet', 'credit-card', 'banknote', 'piggy-bank', 'building',
  'utensils', 'car', 'home', 'heart-pulse', 'book', 'gamepad-2',
  'shirt', 'ellipsis', 'briefcase', 'laptop', 'trending-up', 'plus-circle',
] as const

export type ColorToken = typeof COLOR_TOKENS[number]
export type IconToken = typeof ICON_TOKENS[number]
