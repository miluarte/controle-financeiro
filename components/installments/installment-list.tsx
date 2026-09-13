'use client'

import { useState } from 'react'
import { useInstallments } from '@/hooks/use-installments'
import { InstallmentGroupCard } from './installment-group-card'
import { InstallmentGroupEditForm } from './installment-group-edit-form'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { InstallmentGroup } from '@/lib/types'

export function InstallmentList() {
  const { groups, loading, error } = useInstallments()
  const [editing, setEditing] = useState<InstallmentGroup | null>(null)

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>
  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (groups.length === 0)
    return <p className="text-sm text-muted-foreground">Nenhum parcelamento encontrado.</p>

  return (
    <>
      <div className="space-y-3">
        {groups.map(group => (
          <InstallmentGroupCard
            key={group.id}
            group={group}
            onClick={() => setEditing(group)}
          />
        ))}
      </div>

      <Sheet open={!!editing} onOpenChange={open => { if (!open) setEditing(null) }}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Editar parcelamento</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto px-4 pb-6">
            {editing && (
              <InstallmentGroupEditForm
                group={editing}
                onSuccess={() => setEditing(null)}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
