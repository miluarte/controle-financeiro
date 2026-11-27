import { TokenIcon } from './token-icon'

// Ícone de categoria: cinza por padrão (a cor da categoria não é escolhida); em entrada de dinheiro,
// `tone="success"` usa o verde dos tokens de categoria. Traço (Linear) por padrão,
// preenchido (Bold) quando a categoria está selecionada.
const TONE_COLOR = { default: 'gray', success: 'green' } as const

export function CategoryIcon({ icon, size, active, tone = 'default', className }: {
  icon: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  active?: boolean
  tone?: keyof typeof TONE_COLOR
  className?: string
}) {
  return <TokenIcon icon={icon} color={TONE_COLOR[tone]} size={size} active={active} className={className} />
}
