'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { FormRow } from '@/components/ios/form-row'
import { ListGroup } from '@/components/ios/list-group'
import { ModalSheet } from '@/components/ios/modal-sheet'
import { useDeleteAction } from '@/components/ios/use-delete-action'
import { useArchiveAction } from '@/components/ios/use-archive-action'
import { SegmentedControl } from '@/components/ios/segmented-control'
import { ChoiceChip } from '@/components/shared/choice-chip'
import { CategoryIcon } from '@/components/shared/category-icon'
import { useRefresh } from '@/hooks/use-refresh'
import { categoriesApi } from '@/lib/api/categories'
import { ICON_TOKENS } from '@/lib/constants'
import type { Category } from '@/lib/types'
import { feedback } from '@/lib/feedback'
import { FormError } from '@/components/shared/form-error'

// CAT-5 e CAT-6: renomear, ícone, classe, arquivar e excluir. Categorias são sempre cinza e em ordem alfabética.
export function CategoryFormSheet({
  category, onClose,
}: { category: Category | null; onClose: () => void }) {
  const del = useDeleteAction({ title: `Excluir "${category?.name ?? ''}"?`, remove: () => categoriesApi.remove(category!.id), onDone: onClose })
  const archive = useArchiveAction(onClose)
  return (
    <>
      <ModalSheet open={!!category} onOpenChange={o => { if (!o) onClose() }} title="Categoria" formId="category" actionLabel="Salvar"
        onDelete={del.ask}
        secondaryAction={category ? archive.action(category.active, () => categoriesApi.update(category.id, { active: !category.active })) : undefined}>
        {category && <Form key={category.id} c={category} onDone={onClose} />}
      </ModalSheet>
      {del.sheet}
    </>
  )
}

function Form({ c, onDone }: { c: Category; onDone: () => void }) {
  const refresh = useRefresh()
  const [name, setName] = useState(c.name)
  const [icon, setIcon] = useState(c.icon)
  const [klass, setKlass] = useState<'essential' | 'desire' | 'none'>(c.class ?? 'none')
  const [error, setError] = useState<string | null>(null)

  async function run(fn: () => Promise<unknown>) {
    setError(null)
    try { await fn(); await refresh(); onDone(); feedback.done('Salvo') }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível concluir.') }
  }


  function save(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Dê um nome.'); return }
    run(() => categoriesApi.update(c.id, {
      name: name.trim(), icon, class: c.type === 'expense' && klass !== 'none' ? klass : null,
    }))
  }

  return (
    <form id="category" onSubmit={save} className="space-y-6">
      <div className="flex justify-center"><CategoryIcon icon={icon} size="lg" /></div>
      <ListGroup>
        <FormRow label="Nome" htmlFor="c-name">
          <Input id="c-name" variant="bare" value={name} onChange={e => setName(e.target.value)} className="text-right" />
        </FormRow>
      </ListGroup>

      {c.type === 'expense' && (
        <ListGroup header="Classe" >
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
              <CategoryIcon active={icon === i} icon={i} size="sm" />
            </ChoiceChip>
          ))}
        </li>
      </ListGroup>

      <FormError message={error} />
    </form>
  )
}
