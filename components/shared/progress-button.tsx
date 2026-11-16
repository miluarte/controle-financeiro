import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Botão que vira barra de progresso (0 a 100): a parte preenchida usa a cor principal e o texto
// inverte de cor onde a barra já passou.
export function ProgressButton({ progress, children, className }: {
  progress: number; children: React.ReactNode; className?: string
}) {
  const pct = Math.max(0, Math.min(100, progress))
  const content = <span className="flex items-center justify-center gap-2">{children}</span>
  return (
    <Button type="button" variant="secondary" disabled aria-busy
      className={cn('relative w-full overflow-hidden rounded-full disabled:opacity-100', className)}>
      <span role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>{content}</span>
      <span aria-hidden
        className="absolute inset-0 flex items-center justify-center bg-primary text-primary-foreground transition-[clip-path] duration-300 ease-out"
        style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}>
        {content}
      </span>
    </Button>
  )
}
