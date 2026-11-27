import { TokenIcon } from './token-icon'

// Ícone de categoria: cinza por padrão; em entrada de dinheiro, `tone="success"` usa o verde dos tokens
// de categoria. `tone="own"` usa a cor da própria categoria (`color`), só na análise por categoria.
// Traço (Linear) por padrão, preenchido (Bold) quando a categoria está selecionada.
const TONE_COLOR = { default: 'gray', success: 'green' } as const

export function CategoryIcon({ icon, size, active, tone = 'default', color, className }: {
  icon: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  active?: boolean
  tone?: keyof typeof TONE_COLOR | 'own'
  color?: string
  className?: string
}) {
  const c = tone === 'own' ? color ?? 'gray' : TONE_COLOR[tone]
  return <TokenIcon icon={icon} color={c} size={size} active={active} className={className} />
}
