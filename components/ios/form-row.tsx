import { cn } from '@/lib/utils'

// Linha de formulário agrupado: rótulo à esquerda e campo sem borda à direita, como no app Ajustes.
// Com stacked, o rótulo fica em cima (para listas de opções). Rótulo longo corta com reticências numa linha.
interface FormRowProps {
  label: React.ReactNode
  htmlFor?: string
  children: React.ReactNode
  stacked?: boolean
  className?: string
}

export function FormRow({ label, htmlFor, children, stacked, className }: FormRowProps) {
  return (
    <li className="group/row pl-4">
      <div
        className={cn(
          'flex min-h-row border-b border-separator pr-4 group-last/row:border-b-0',
          stacked ? 'flex-col gap-2.5 py-3' : 'items-center gap-3',
          className,
        )}
      >
        <label
          htmlFor={htmlFor}
          className={cn('block min-w-0', stacked ? 'truncate text-footnote uppercase text-muted-foreground' : 'max-w-3/5 shrink truncate text-body')}
        >
          {label}
        </label>
        <div className={cn('min-w-0', !stacked && 'flex flex-1 justify-end')}>{children}</div>
      </div>
    </li>
  )
}
