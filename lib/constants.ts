// As categorias padrão de cada conta nova são criadas pelo banco
// (trigger handle_new_user, ver docs/banco-de-dados.md).

export const COLOR_TOKENS = [
  'red', 'rose', 'pink', 'fuchsia', 'purple', 'violet', 'indigo', 'blue', 'sky', 'cyan', 'teal', 'emerald', 'green', 'lime', 'yellow', 'amber', 'orange', 'gray',
] as const

export const ICON_TOKENS = [
  'wallet', 'credit-card', 'banknote', 'piggy-bank', 'building', 'safe', 'hand-money', 'card-transfer',
  'bill', 'document', 'tag', 'home', 'sofa', 'broom', 'lightbulb', 'waterdrop',
  'wifi', 'key', 'shield', 'utensils', 'chef-hat', 'cart', 'bag', 'box',
  'car', 'bus', 'fuel', 'bicycle', 'plane', 'globe', 'heart-pulse', 'pill',
  'stethoscope', 'dumbbell', 'cosmetic', 'scissors', 'users', 'paw', 'shirt', 'hanger',
  'gift', 'hand-heart', 'gamepad-2', 'ticket', 'music', 'tv', 'football', 'palette',
  'book', 'laptop', 'smartphone', 'briefcase', 'trending-up', 'repeat', 'undo', 'plus-circle',
  'ellipsis',
] as const

// Cores usadas fora do CSS (meta theme-color e manifest), que não leem variáveis CSS.
// Espelham app/tokens/semantic.css: --surface-page (zinc-50 / zinc-950) e --action-primary (zinc-950).
export const SYSTEM_COLORS = {
  pageLight: '#fafafa',
  pageDark: '#09090b',
  actionPrimary: '#09090b',
} as const

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

// CAR-3: acabamentos do cartão
export const WALLET_FINISHES = [
  { value: 'black', label: 'Preto' },
  { value: 'graphite', label: 'Grafite' },
  { value: 'gray', label: 'Cinza' },
  { value: 'silver', label: 'Prata' },
  { value: 'white', label: 'Branco' },
  { value: 'purple', label: 'Roxo' },
  { value: 'blue', label: 'Azul' },
  { value: 'green', label: 'Verde' },
  { value: 'red', label: 'Vermelho' },
  { value: 'gold', label: 'Dourado' },
] as const

export const WALLET_TYPES = [
  { value: 'pix', label: 'Pix' },
  { value: 'debit', label: 'Débito' },
  { value: 'credit', label: 'Crédito' },
  { value: 'cash', label: 'Dinheiro' },
  { value: 'other', label: 'Outro' },
] as const
