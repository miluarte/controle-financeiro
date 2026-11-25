import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// Lista agrupada. inset: cantos arredondados em card (estilo "inset grouped" do iOS), cabeçalho em
// footnote maiúsculo. filled: o mesmo card em cinza claro. plain: sem card, direto no fundo da tela (Início), cabeçalho em subheadline.
// Linhas separadas por hairline com recuo.
const listVariants = cva('', {
  variants: {
    variant: {
      inset: 'overflow-hidden rounded-3xl bg-grouped',
      plain: '-mx-4',
      // card cinza claro, para quando o fundo da tela já é o dos cards (Início)
      filled: 'overflow-hidden rounded-3xl bg-fill',
    },
  },
  defaultVariants: { variant: 'inset' },
})

const headerVariants = cva('text-muted-foreground', {
  variants: {
    variant: {
      inset: 'px-4 text-footnote uppercase',
      plain: 'text-subheadline',
      filled: 'px-4 text-footnote uppercase',
    },
  },
  defaultVariants: { variant: 'inset' },
})

interface ListGroupProps extends React.ComponentProps<'section'>, VariantProps<typeof listVariants> {
  header?: React.ReactNode
  footer?: React.ReactNode
}

export function ListGroup({ header, footer, variant, className, children, ...props }: ListGroupProps) {
  return (
    <section className={cn('space-y-1.5', className)} {...props}>
      {header && <h2 className={headerVariants({ variant })}>{header}</h2>}
      <ul className={listVariants({ variant })}>{children}</ul>
      {footer && <p className="px-4 text-footnote text-muted-foreground">{footer}</p>}
    </section>
  )
}
