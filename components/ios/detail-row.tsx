import { cva, type VariantProps } from 'class-variance-authority'
import { AltArrowRightLinearIcon } from '@solar-icons/react'

// Linha de informação do detalhe (ex.: Estabelecimento, Cartão, Categoria): rótulo pequeno em cima e o
// valor embaixo, em text-field (14px), cada um numa linha só com reticências. Com onClick, a linha abre outra tela e mostra a seta.
const detailRowVariants = cva(
  'flex min-h-row w-full items-center gap-3 pl-4 text-left',
  {
    variants: {
      interactive: {
        true: 'transition-colors active:bg-fill',
        false: '',
      },
    },
    defaultVariants: { interactive: false },
  },
)

interface DetailRowProps extends VariantProps<typeof detailRowVariants> {
  label: string
  value: React.ReactNode
  // ícone à esquerda (ex.: o da categoria)
  leading?: React.ReactNode
  // à direita do valor (ex.: um valor em dinheiro)
  trailing?: React.ReactNode
  onClick?: () => void
}

export function DetailRow({ label, value, leading, trailing, onClick }: DetailRowProps) {
  const content = (
    <>
      {leading && <span className="shrink-0">{leading}</span>}
      <span className="flex min-w-0 flex-1 items-center gap-2 self-stretch border-b border-separator py-3 pr-4 group-last/row:border-b-0">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-field text-muted-foreground">{label}</span>
          <span className="block truncate text-field font-semibold text-foreground">{value}</span>
        </span>
        {trailing && <span className="shrink-0">{trailing}</span>}
        {onClick && <AltArrowRightLinearIcon className="size-4 shrink-0 stroke-(length:--icon-stroke-chevron) text-muted-foreground" />}
      </span>
    </>
  )
  return (
    <li className="group/row">
      {onClick ? (
        <button type="button" onClick={onClick} className={detailRowVariants({ interactive: true })}>{content}</button>
      ) : (
        <div className={detailRowVariants({ interactive: false })}>{content}</div>
      )}
    </li>
  )
}
