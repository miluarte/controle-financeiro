'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormRow } from '@/components/ios/form-row'
import { ListGroup } from '@/components/ios/list-group'
import { ModalSheet } from '@/components/ios/modal-sheet'
import { SegmentedControl } from '@/components/ios/segmented-control'
import { ChoiceChip } from '@/components/shared/choice-chip'
import { TokenIcon } from '@/components/shared/token-icon'
import { useRefresh } from '@/hooks/use-refresh'
import { categoriesApi } from '@/lib/api/categories'
import { COLOR_TOKENS, ICON_TOKENS } from '@/lib/constants'
import type { Category } from '@/lib/types'

// CAT-5 e CAT-6: renomear, ícone, cor, classe, mover, arquivar e excluir.
export function CategoryFormSheet({
  category, siblings, onClose,
}: { category: Category | null; siblings: Category[]; onClose: () => void }) {
  return (
    <ModalSheet open={!!category} onOpenChange={o => { if (!o) onClose() }} title="Categoria" formId="category" actionLabel="Salvar">
      {category && <Form key={category.id} c={category} siblings={siblings} onDone={onClose} />}
    </ModalSheet>
  )
}

function Form({ c, siblings, onDone }: { c: Category; siblings: Category[]; onDone: () => void }) {
  const refresh = useRefresh()
  const [name, setName] = useState(c.name)
  const [icon, setIcon] = useState(c.icon)
  const [color, setColor] = useState(c.color)
  const [klass, setKlass] = useState<'essential' | 'desire' | 'none'>(c.class ?? 'none')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const index = siblings.findIndex(s => s.id === c.id)

  async function run(fn: () => Promise<unknown>, close = true) {
    setBusy(true); setError(null)
    try { await fn(); await refresh(); if (close) onDone() }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível concluir.') }
    finally { setBusy(false) }
  }

  // reordenar: troca a posição com o vizinho e renumera a lista
  function move(delta: number) {
    const list = [...siblings]
    const j = index + delta
    if (j < 0 || j >= list.length) return
    ;[list[index], list[j]] = [list[j], list[index]]
    run(() => Promise.all(list.map((s, i) => categoriesApi.update(s.id, { sort_order: i }))), false)
  }

  function save(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Dê um nome.'); return }
    run(() => categoriesApi.update(c.id, {
      name: name.trim(), icon, color, class: c.type === 'expense' && klass !== 'none' ? klass : null,
    }))
  }

  return (
    <form id="category" onSubmit={save} className="space-y-6">
      <div className="flex justify-center"><TokenIcon icon={icon} color={color} size="lg" /></div>
      <ListGroup>
        <FormRow label="Nome" htmlFor="c-name">
          <Input id="c-name" variant="bare" value={name} onChange={e => setName(e.target.value)} className="text-right" />
        </FormRow>
      </ListGroup>

      {c.type === 'expense' && (
        <ListGroup header="Classe" footer="Usada no replanejamento de metas: Essencial ou Desejo.">
          <li className="p-3">
            <SegmentedControl aria-label="Classe" value={klass} onChange={setKlass}
              options={[{ value: 'essential', label: 'Essencial' }, { value: 'desire', label: 'Desejo' }, { value: 'none', label: 'Nenhuma' }]} />
          </li>
        </ListGroup>
      )}

      <ListGroup header="Ícone">
        <li className="flex flex-wrap gap-2 p-3">
          {ICON_TOKENS.map(i => (
            <ChoiceChip key={i} selected={icon === i} onClick={() => setIcon(i)} className="px-1" aria-label={i}>
              <TokenIcon icon={i} color={color} size="sm" />
            </ChoiceChip>
          ))}
        </li>
      </ListGroup>

      <ListGroup header="Cor">
        <li className="flex flex-wrap gap-2 p-3">
          {COLOR_TOKENS.map(k => (
            <ChoiceChip key={k} selected={color === k} onClick={() => setColor(k)} className="px-1" aria-label={k}>
              <TokenIcon icon={icon} color={k} size="sm" />
            </ChoiceChip>
          ))}
        </li>
      </ListGroup>

      <ListGroup header="Posição">
        <li className="grid grid-cols-2 gap-2 p-3">
          <Button type="button" variant="secondary" disabled={busy || index <= 0} onClick={() => move(-1)}>Subir</Button>
          <Button type="button" variant="secondary" disabled={busy || index < 0 || index >= siblings.length - 1} onClick={() => move(1)}>Descer</Button>
        </li>
      </ListGroup>

      {error && <p className="px-4 text-footnote text-destructive">{error}</p>}

      <div className="space-y-2">
        <Button type="button" variant="secondary" size="lg" className="w-full" disabled={busy}
          onClick={() => run(() => categoriesApi.update(c.id, { active: !c.active }))}>
          {c.active ? 'Arquivar' : 'Reativar'}
        </Button>
        <Button type="button" variant="ghost" size="lg" className="w-full text-destructive" disabled={busy}
          onClick={() => { if (confirm(`Excluir "${c.name}"?`)) run(() => categoriesApi.remove(c.id)) }}>
          Excluir
        </Button>
      </div>
    </form>
  )
}
