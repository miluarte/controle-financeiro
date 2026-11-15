import { cn } from '@/lib/utils'

// Lista agrupada com cantos arredondados (estilo "inset grouped" do iOS).
// Cabeçalho e rodapé em texto footnote cinza, linhas separadas por hairline com recuo.

interface ListGroupProps extends React.ComponentProps<'section'> {
  header?: React.ReactNode
  footer?: React.ReactNode
}

export function ListGroup({ header, footer, className, children, ...props }: ListGroupProps) {
  return (
    <section className={cn('space-y-1.5', className)} {...props}>
      {header && (
        <h2 className="px-4 text-footnote uppercase text-muted-foreground">{header}</h2>
      )}
      <ul className="overflow-hidden rounded-xl bg-grouped">{children}</ul>
      {footer && <p className="px-4 text-footnote text-muted-foreground">{footer}</p>}
    </section>
  )
}
