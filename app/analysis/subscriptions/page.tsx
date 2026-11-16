'use client'

import { useState } from 'react'
import { AddLinearIcon } from '@solar-icons/react'
import { SubscriptionSheet } from '@/components/advanced/subscription-sheet'
import { GlassButton } from '@/components/ios/glass-button'
import { LargeTitleHeader } from '@/components/ios/large-title-header'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { MonthSelector } from '@/components/shared/month-selector'
import { useSubscriptions } from '@/hooks/use-data'
import { useMonth } from '@/hooks/use-month'
import { subscriptionCost } from '@/lib/advanced'
import { cn, formatCurrency } from '@/lib/utils'
import { LoadingBlock } from '@/components/shared/loading-dots'
import { subscriptionsApi } from '@/lib/api/advanced'
import { useConfirmDelete } from '@/components/ios/use-delete-action'

// Custo por uso de cada assinatura no mês, e quanto sairia pagando avulso.
export default function SubscriptionsPage() {
  const { month } = useMonth()
  const { subscriptions, uses, loading } = useSubscriptions(month)
  const [openId, setOpenId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const del = useConfirmDelete()
  const current = subscriptions.find(s => s.id === openId) ?? null
  const daysOf = (id: string) => uses.filter(u => u.subscriptionId === id).map(u => u.usedOn)

  function openSub(id: string | null) { setOpenId(id); setOpen(true) }

  return (
    <>
      <LargeTitleHeader back title="Assinaturas"
        actions={<GlassButton aria-label="Nova assinatura" onClick={() => openSub(null)}><AddLinearIcon /></GlassButton>} />
      <div className="space-y-7 px-4 pt-2">
        <div className="flex"><MonthSelector /></div>
        {loading ? (
          <LoadingBlock />
        ) : subscriptions.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-headline">Nenhuma assinatura</p>
            <p className="text-subheadline text-muted-foreground">Toque no + para criar</p>
          </div>
        ) : (
          <ListGroup header="Custo por uso no mês">
            {subscriptions.map(s => {
              const c = subscriptionCost(s, daysOf(s.id).length)
              const note = c.loss == null ? null : c.loss > 0 ? `Avulso: ${formatCurrency(c.loss)} a menos` : 'Compensa'
              return (
                <ListRow key={s.id} onClick={() => openSub(s.id)} chevron
                  onDelete={() => del.ask({ title: `Excluir "${s.name}"?`, remove: () => subscriptionsApi.remove(s.id) })}
                  title={s.name}
                  subtitle={<>{c.uses} {c.uses === 1 ? 'uso' : 'usos'} · {formatCurrency(s.monthlyAmount)}/mês{note && <><br />{note}</>}</>}
                  trailing={
                    <span className={cn('text-body font-semibold tabular-nums', c.loss != null && c.loss > 0 ? 'text-destructive' : 'text-foreground')}>
                      {c.costPerUse != null ? formatCurrency(c.costPerUse) : 'Sem uso'}
                    </span>
                  } />
              )
            })}
          </ListGroup>
        )}
      </div>
      {del.sheet}
      <SubscriptionSheet open={open} subscription={current} month={month} usedDays={current ? daysOf(current.id) : []} onOpenChange={setOpen} />
    </>
  )
}
