'use client'

import { useState } from 'react'
import { useInstallments } from '@/hooks/use-installments'
import { effectivePaidCount } from '@/lib/utils'
import { InstallmentGroupCard } from './installment-group-card'
import { InstallmentGroupEditForm } from './installment-group-edit-form'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { InstallmentGroup } from '@/lib/types'

function hasInstallmentInMonth(group: InstallmentGroup, ym: string): boolean {
  const start = new Date(group.startDate.slice(0, 10) + 'T12:00:00')
  const [y, m] = ym.split('-').map(Number)
  const monthIndex = (y - start.getFullYear()) * 12 + (m - 1 - start.getMonth())
  const paid = effectivePaidCount(group.paidCount, group.installmentCount, group.startDate)
  return monthIndex >= paid && monthIndex < group.installmentCount
}

interface InstallmentListProps {
  selectedMonth?: string
}

export function InstallmentList({ selectedMonth }: InstallmentListProps) {
  const { groups, loading, error } = useInstallments()
  const [editing, setEditing] = useState<InstallmentGroup | null>(null)

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>
  if (error) return <p className="text-sm text-destructive">{error}</p>

  const visible = selectedMonth
    ? groups.filter(g => g.status === 'active' && hasInstallmentInMonth(g, selectedMonth))
    : groups

  if (visible.length === 0)
    return <p className="text-sm text-muted-foreground">Nenhum parcelamento encontrado.</p>

  return (
    <>
      <div className="space-y-3">
        {visible.map(group => (
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
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
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
