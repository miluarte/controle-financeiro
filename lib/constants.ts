// As categorias padrão de cada conta nova são criadas pelo banco
// (trigger handle_new_user, ver docs/banco-de-dados.md).

export const COLOR_TOKENS = [
  'red', 'orange', 'yellow', 'green', 'teal', 'blue', 'indigo', 'purple', 'pink', 'gray',
] as const

export const ICON_TOKENS = [
  'wallet', 'credit-card', 'banknote', 'piggy-bank', 'building',
  'utensils', 'car', 'home', 'heart-pulse', 'book', 'gamepad-2',
  'shirt', 'ellipsis', 'briefcase', 'laptop', 'trending-up', 'plus-circle',
  'repeat', 'undo', 'gift',
] as const

export type ColorToken = typeof COLOR_TOKENS[number]
export type IconToken = typeof ICON_TOKENS[number]

// Ícone de cada tipo de carteira
export const WALLET_TYPE_ICON: Record<string, IconToken> = {
  pix: 'wallet',
  debit: 'building',
  credit: 'credit-card',
  cash: 'banknote',
  other: 'piggy-bank',
}
