'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ColorPicker } from '@/components/shared/color-picker'
import { IconPicker } from '@/components/shared/icon-picker'
import { useCategories } from '@/hooks/use-categories'
import type { CategoryType } from '@/lib/types'
import type { ColorToken, IconToken } from '@/lib/constants'

interface CategoryFormProps {
  onSuccess?: () => void
}

export function CategoryForm({ onSuccess }: CategoryFormProps) {
  const { create } = useCategories()
  const [name, setName] = useState('')
  const [type, setType] = useState<CategoryType>('expense')
  const [color, setColor] = useState<ColorToken | null>(null)
  const [icon, setIcon] = useState<IconToken | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Dê um nome pra categoria.')
      return
    }
    if (!color) {
      setError('Escolha uma cor.')
      return
    }
    if (!icon) {
      setError('Escolha um ícone.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await create({ name: name.trim(), type, color, icon, isDefault: false })
      setName('')
      setColor(null)
      setIcon(null)
      onSuccess?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao criar categoria')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Tabs value={type} onValueChange={v => setType(v as CategoryType)}>
        <TabsList className="w-full">
          <TabsTrigger value="expense" className="flex-1">Despesa</TabsTrigger>
          <TabsTrigger value="income" className="flex-1">Receita</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-1.5">
        <Label htmlFor="category-name">Nome</Label>
        <Input
          id="category-name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ex: Pets, Assinaturas"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Cor</Label>
        <ColorPicker value={color} onChange={setColor} />
      </div>

      <div className="space-y-1.5">
        <Label>Ícone</Label>
        <IconPicker value={icon} onChange={setIcon} />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={submitting} className="w-full">
        Criar categoria
      </Button>
    </form>
  )
}
