import { cn } from '@/lib/utils'

// Indicador de progresso das etapas.
export function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex justify-center gap-1.5" aria-label={`Etapa ${step + 1} de ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={cn('h-1.5 rounded-full transition-all', i === step ? 'w-6 bg-tint' : 'w-1.5 bg-fill')} />
      ))}
    </div>
  )
}
