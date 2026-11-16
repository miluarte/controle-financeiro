import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Botão que se preenche da esquerda para a direita enquanto uma tarefa anda (progress de 0 a 100).
export function ProgressButton({ progress, children, className }: {
  progress: number; children: React.ReactNode; className?: string
}) {
  const pct = Math.max(0, Math.min(100, progress))
  return (
    <Button type="button" variant="secondary" disabled aria-busy
      className={cn('relative w-full overflow-hidden rounded-full disabled:opacity-100', className)}>
      <span aria-hidden className="absolute inset-y-0 left-0 bg-primary/15 transition-[width] duration-300 ease-out"
        style={{ width: `${pct}%` }} />
      <span className="relative flex items-center gap-2" role="status">{children}</span>
    </Button>
  )
}
