import { Panel } from '@/components/ios/panel'
import { Stat } from '@/components/ios/stat'
import { Money } from '@/components/shared/money'

// Resumo em linhas (rótulo | valor) num cartão arredondado, no topo da aba Cartões e da tela da pessoa.
export function SummaryCard({ rows }: { rows: { label: string; value: number; tone?: 'success' }[] }) {
  return (
    <Panel>
      <dl className="space-y-1">
        {rows.map(r => (
          <Stat key={r.label} layout="inline" label={r.label}>
            <Money as="dd" size="headline" className="shrink-0" tone={r.tone ?? 'default'} cents={r.value} />
          </Stat>
        ))}
      </dl>
    </Panel>
  )
}
