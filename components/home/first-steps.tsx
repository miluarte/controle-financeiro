'use client'

import Link from 'next/link'
import { CheckCircleBoldIcon, ClockCircleLinearIcon } from '@solar-icons/react'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { useHistory, useOwnWallets } from '@/hooks/use-data'
import { useMonthSummary } from '@/hooks/use-month-summary'
import { useProfile } from '@/hooks/use-profile'
import { useRefresh } from '@/hooks/use-refresh'
import { profileApi } from '@/lib/api/profile'
import { currentMonth } from '@/lib/utils'

// HOM-5: checklist "Primeiros passos" com contador e botão de dispensar.
// O passo "ligar o toque duplo" entra com as automações (v2); por ora o terceiro passo é cadastrar um cartão.
export function FirstSteps() {
  const { profile } = useProfile()
  const { history } = useHistory(12)
  const { summary } = useMonthSummary(currentMonth())
  const { wallets } = useOwnWallets()
  const refresh = useRefresh()

  if (!profile || profile.onboardingDismissed) return null

  const steps = [
    { label: 'Adicionar gasto', done: history.some(h => h.spending > 0), href: null },
    { label: 'Definir orçamento', done: summary?.budget != null, href: '/analysis' },
    { label: 'Adicionar cartão', done: wallets.length > 2, href: '/config/wallets' },
  ]
  const doneCount = steps.filter(s => s.done).length

  async function dismiss() {
    await profileApi.update(profile!.id, { onboarding_dismissed: true })
    await refresh()
  }

  return (
    <ListGroup
      variant="filled"
      header={`Primeiros passos · ${doneCount} de ${steps.length}`}
      footer={<button type="button" onClick={dismiss} className="text-tint">Dispensar</button>}
    >
      {steps.map(s => {
        const row = (
          <ListRow
            leading={s.done
              ? <CheckCircleBoldIcon className="size-6 text-success" />
              : <ClockCircleLinearIcon className="size-6 text-muted-foreground" />}
            title={<span className={s.done ? 'text-muted-foreground line-through' : undefined}>{s.label}</span>}
            chevron={!!s.href && !s.done}
          />
        )
        return s.href && !s.done
          ? <Link key={s.label} href={s.href} className="block active:bg-fill">{row}</Link>
          : <div key={s.label}>{row}</div>
      })}
    </ListGroup>
  )
}
