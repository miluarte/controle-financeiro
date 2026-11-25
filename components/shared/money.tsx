import { cva, type VariantProps } from 'class-variance-authority'
import { cn, formatCurrency } from '@/lib/utils'

// Valor em dinheiro (centavos → "R$ 1.234,56"), sempre com algarismos de largura fixa.
// Tamanho e cor por variant; mudar aqui muda todos os valores do app.
const moneyVariants = cva('tabular-nums', {
  variants: {
    size: {
      display: 'text-large-title font-bold', // valor principal de uma folha (fatura, acerto)
      title: 'text-title1 font-bold', // valor principal de um card (saldo, gasto do mês)
      headline: 'text-headline', // números de resumo (dt/dd)
      row: 'text-body font-semibold', // valor à direita de uma linha de lista
      rowRegular: 'text-body', // valor secundário de uma linha (parte, detalhe)
      item: 'text-subheadline font-bold', // valor do item de lançamento e dos totais do card de saldo
      inherit: '', // herda o tamanho do texto em volta
    },
    tone: {
      default: 'text-foreground',
      success: 'text-success',
      danger: 'text-destructive',
      muted: 'text-muted-foreground',
      inherit: '',
    },
  },
  defaultVariants: { size: 'row', tone: 'default' },
})

type MoneyTag = 'span' | 'p' | 'dd'

interface MoneyProps extends VariantProps<typeof moneyVariants> {
  cents: number
  // "+" na receita; sem sinal no gasto
  sign?: '+'
  // texto no lugar do valor (ex.: valores ocultos "R$ ••••")
  mask?: string
  suffix?: string
  as?: MoneyTag
  className?: string
}

export function Money({ cents, sign, mask, suffix, as: Tag = 'span', size, tone, className }: MoneyProps) {
  return (
    <Tag className={cn(moneyVariants({ size, tone }), className)}>
      {mask ?? `${sign ?? ''}${formatCurrency(cents)}`}{suffix}
    </Tag>
  )
}

export { moneyVariants }
