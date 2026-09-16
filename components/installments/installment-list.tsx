'use client'

import { useState } from 'react'
import { useInstallments } from '@/hooks/use-installments'
import { useAllTransactions } from '@/hooks/use-all-transactions'
import { useAccounts } from '@/hooks/use-accounts'
import { useRecurringGroups } from '@/hooks/use-recurring-groups'
import { useCategories } from '@/hooks/use-categories'
import { effectivePaidCount } from '@/lib/utils'
import { buildFaturaContext, isCountedInFatura, faturaMonthOf } from '@/lib/fatura'
import { InstallmentGroupCard } from './installment-group-card'
import { InstallmentGroupEditForm } from './installment-group-edit-form'
import { TransactionItem } from '@/components/transactions/transaction-item'
import { TransactionForm } from '@/components/transactions/transaction-form'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { InstallmentGroup, Transaction } from '@/lib/types'

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
  const { groups, loading: loadingGroups, error: errorGroups } = useInstallments()
  const { transactions, loading: loadingTx, error: errorTx, reload: reloadTransactions } = useAllTransactions()
  const { accounts, loading: loadingAccounts } = useAccounts()
  const { groups: recurringGroups, loading: loadingRecurring } = useRecurringGroups()
  const { categories } = useCategories()
  const [editingGroup, setEditingGroup] = useState<InstallmentGroup | null>(null)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)

  const loading = loadingGroups || loadingTx || loadingAccounts || loadingRecurring
  const error = errorGroups || errorTx

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>
  if (error) return <p className="text-sm text-destructive">{error}</p>

  const visibleGroups = selectedMonth
    ? groups.filter(g => g.status === 'active' && hasInstallmentInMonth(g, selectedMonth))
    : groups

  // Compras únicas e ocorrências de recorrência/conta fixa do cartão nesse
  // mês — parcelamentos ficam de fora daqui porque já aparecem agrupados
  // acima, num card por grupo (não um por parcela). Mesmo filtro do total do
  // gráfico (lib/fatura.ts), pra lista e soma nunca ficarem incoerentes entre si.
  const otherTransactions = (() => {
    if (!selectedMonth) return []
    const ctx = buildFaturaContext(accounts, groups, recurringGroups)
    return transactions.filter(t =>
      !t.installmentGroupId &&
      isCountedInFatura(t, ctx) &&
      faturaMonthOf(t) === selectedMonth,
    )
  })()

  if (visibleGroups.length === 0 && otherTransactions.length === 0)
    return <p className="text-sm text-muted-foreground">Nenhum lançamento encontrado.</p>

  return (
    <>
      <div className="space-y-3">
        {visibleGroups.map(group => (
          <InstallmentGroupCard
            key={group.id}
            group={group}
            selectedMonth={selectedMonth}
            onClick={() => setEditingGroup(group)}
          />
        ))}

        {otherTransactions.length > 0 && (
          <div className="divide-y rounded-xl border px-4">
            {otherTransactions.map((tx, i) => (
              <div key={tx.id}>
                <TransactionItem
                  transaction={tx}
                  category={categories.find(c => c.id === tx.categoryId)}
                  onClick={() => setEditingTx(tx)}
                />
                {i < otherTransactions.length - 1 && <Separator />}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edição de parcelamento pode recriar as transações do grupo no backend
          (ver InstallmentGroupEditForm) — recarrega a lista "all" de
          transações ao fechar pra não deixar a fatura com dados velhos. */}
      <Sheet
        open={!!editingGroup}
        onOpenChange={open => { if (!open) { setEditingGroup(null); reloadTransactions() } }}
      >
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Editar parcelamento</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
            {editingGroup && (
              <InstallmentGroupEditForm
                group={editingGroup}
                onSuccess={() => setEditingGroup(null)}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* TransactionForm só atualiza o cache do mês corrente (useTransactions);
          recarrega "all" ao fechar pra fatura refletir a edição/exclusão. */}
      <Sheet
        open={!!editingTx}
        onOpenChange={open => { if (!open) { setEditingTx(null); reloadTransactions() } }}
      >
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Editar transação</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto px-4 pb-6">
            {editingTx && (
              <TransactionForm
                initialTransaction={editingTx}
                onSuccess={() => setEditingTx(null)}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
