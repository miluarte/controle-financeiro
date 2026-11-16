import { ListGroup } from '@/components/ios/list-group'

// Passo a passo de uma automação no app Atalhos. Campos do "Obter conteúdo de URL" em destaque.
export function AutomationGuide({ title, steps, fields }: { title: string; steps: string[]; fields: [string, string][] }) {
  return (
    <ListGroup header={title}>
      <li className="space-y-3 px-4 py-3">
        <ol className="list-decimal space-y-1 pl-5 text-subheadline">
          {steps.map(s => <li key={s}>{s}</li>)}
        </ol>
        <dl className="space-y-1 rounded-2xl bg-fill p-3 text-footnote">
          {fields.map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <dt className="w-6 shrink-0 font-mono font-semibold">{k}</dt>
              <dd className="text-muted-foreground">{v}</dd>
            </div>
          ))}
        </dl>
      </li>
    </ListGroup>
  )
}
