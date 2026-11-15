import { cn } from '@/lib/utils'

// Moldura de cada etapa do onboarding: ícone, título, texto e conteúdo.
export function OnboardingStep({
  icon, title, text, children, className,
}: { icon?: React.ReactNode; title: string; text?: string; children?: React.ReactNode; className?: string }) {
  return (
    <section className={cn('space-y-6', className)}>
      <div className="space-y-3 text-center">
        {icon && <div className="flex justify-center">{icon}</div>}
        <h1 className="text-title1 font-bold">{title}</h1>
        {text && <p className="text-body text-muted-foreground">{text}</p>}
      </div>
      {children}
    </section>
  )
}

// Círculo de ícone grande das etapas.
export function StepIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex size-20 items-center justify-center rounded-full bg-fill text-foreground [&_svg]:size-10">
      {children}
    </span>
  )
}
