import { cn } from '@/lib/utils'

// Valor escolhido numa linha de formulário que abre uma folha (ícone + texto na cor de ação),
// com o mesmo visual do seletor nativo (SelectField).
export function PickerValue({ id, icon, label, placeholder = 'Escolher', onClick }: {
  id?: string
  icon?: React.ReactNode
  label?: string
  placeholder?: string
  onClick: () => void
}) {
  return (
    <button type="button" id={id} onClick={onClick}
      className="inline-flex h-row min-w-0 items-center justify-end gap-2 text-body text-tint">
      {icon}
      <span className={cn('min-w-0 truncate', !label && 'text-muted-foreground')}>{label ?? placeholder}</span>
    </button>
  )
}
