import { TokenIcon } from './token-icon'

// Ícone de categoria: sempre cinza (a cor da categoria não é escolhida). Traço (Linear) por padrão,
// preenchido (Bold) quando a categoria está selecionada.
export function CategoryIcon({ icon, size, active, className }: {
  icon: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  active?: boolean
  className?: string
}) {
  return <TokenIcon icon={icon} color="gray" size={size} active={active} className={className} />
}
