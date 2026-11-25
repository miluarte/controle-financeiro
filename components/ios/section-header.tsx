import Link from 'next/link'

// Título de seção solto na tela (fora de um ListGroup), com ação opcional à direita (ex.: Ver todas).
export function SectionHeader({ title, action }: { title: React.ReactNode; action?: { label: string; href: string } }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <h2 className="min-w-0 truncate text-title3 font-bold">{title}</h2>
      {action && <Link href={action.href} className="shrink-0 text-body text-tint active:opacity-(--alpha-half)">{action.label}</Link>}
    </div>
  )
}
