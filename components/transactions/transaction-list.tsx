'use client'

import { useState } from 'react'
import { useTransactions } from '@/hooks/use-transactions'
import { useCategories } from '@/hooks/use-categories'
import { TransactionItem } from './transaction-item'
import { TransactionForm } from './transaction-form'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { Transaction } from '@/lib/types'
import { currentMonth } from '@/lib/utils'

export function TransactionList() {
  const { transactions, loading, error, reload } = useTransactions(currentMonth())
  const { categories } = useCategories()
  const [editing, setEditing] = useState<Transaction | null>(null)

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>
  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (transactions.length === 0)
    return <p className="text-sm text-muted-foreground">Nenhuma transação neste período.</p>

  const handleClose = (open: boolean) => {
    if (!open) {
      setEditing(null)
      reload()
    }
  }

  return (
    <>
      <div className="divide-y">
        {transactions.map((tx, i) => {
          const category = categories.find(c => c.id === tx.categoryId)
          return (
            <div key={tx.id}>
              <TransactionItem
                transaction={tx}
                category={category}
                onClick={() => setEditing(tx)}
              />
              {i < transactions.length - 1 && <Separator />}
            </div>
          )
        })}
      </div>

      <Sheet open={!!editing} onOpenChange={handleClose}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Editar transação</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto px-4 pb-6">
            {editing && (
              <TransactionForm
                initialTransaction={editing}
                onSuccess={() => { setEditing(null); reload() }}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
