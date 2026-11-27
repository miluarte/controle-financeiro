import { Badge } from '@/components/ui/badge'
import { CategoryIcon } from '@/components/shared/category-icon'
import { Money } from '@/components/shared/money'
import { formatCurrency, longDate } from '@/lib/utils'

// Topo do detalhe de um lançamento: ícone da categoria, nome, valor, parcelamento ("em 12x de R$ 57,43"),
// data por extenso e selos (ex.: Compra parcelada).
interface TransactionHeroProps {
  icon: string
  title: string
  cents: number
  inflow: boolean
  installments?: number | null
  date: string
  tags: string[]
}

export function TransactionHero({ icon, title, cents, inflow, installments, date, tags }: TransactionHeroProps) {
  return (
    <header className="space-y-3 px-1">
      <CategoryIcon icon={icon} size="xl" />
      <div className="space-y-1">
        <h2 className="line-clamp-2 text-title2 font-bold break-words">{title}</h2>
        <Money as="p" cents={cents} size="display" tone={inflow ? 'success' : 'default'} sign={inflow ? '+' : undefined} />
        {installments && installments > 1 && (
          <p className="text-headline font-semibold">{`em ${installments}x de ${formatCurrency(Math.round(cents / installments))}`}</p>
        )}
      </div>
      <p className="text-subheadline text-muted-foreground">{longDate(date)}</p>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
        </div>
      )}
    </header>
  )
}
