'use client'

import { useRouter } from 'next/navigation'
import { Switch } from '@/components/ui/switch'
import { FormRow } from '@/components/ios/form-row'
import { ListGroup } from '@/components/ios/list-group'
import { ListRow } from '@/components/ios/list-row'
import { SegmentedControl } from '@/components/ios/segmented-control'
import { useAllCategories, useOwnWallets } from '@/hooks/use-data'
import { useProfile } from '@/hooks/use-profile'
import { useRefresh } from '@/hooks/use-refresh'
import { profileApi, type ProfilePatch } from '@/lib/api/profile'
import type { Theme } from '@/lib/types'

const CURRENCIES = [
  { value: 'BRL', label: 'Real (R$)' },
  { value: 'USD', label: 'Dólar (US$)' },
  { value: 'EUR', label: 'Euro (€)' },
]

function useSaveProfile() {
  const { profile, mutate } = useProfile()
  const refresh = useRefresh()
  return async (patch: ProfilePatch) => {
    if (!profile) return
    await mutate(profileApi.update(profile.id, patch), { revalidate: false })
    await refresh()
  }
}

// NAV-3: tema.
export function AppearanceGroup() {
  const { profile } = useProfile()
  const save = useSaveProfile()
  return (
    <ListGroup header="Aparência">
      <li className="p-3">
        <SegmentedControl<Theme> aria-label="Tema" value={profile?.theme ?? 'system'} onChange={t => save({ theme: t })}
          options={[{ value: 'light', label: 'Claro' }, { value: 'dark', label: 'Escuro' }, { value: 'system', label: 'Automático' }]} />
      </li>
    </ListGroup>
  )
}

// Registro: categorias, carteiras, moeda e saldo acumulado (ANA-10).
export function RegistryGroup() {
  const router = useRouter()
  const { profile } = useProfile()
  const { categories } = useAllCategories()
  const { wallets } = useOwnWallets()
  const save = useSaveProfile()
  const activeExpense = categories.filter(c => c.active && c.type === 'expense').length
  const activeIncome = categories.filter(c => c.active && c.type === 'income').length
  const activeWallets = wallets.filter(w => w.active).length

  return (
    <ListGroup header="Registro" footer="Com o saldo acumulado ligado, o que sobra de um mês passa para o seguinte.">
      <ListRow title="Categorias de gasto" trailing={`${activeExpense} ativas`} chevron onClick={() => router.push('/config/categories')} />
      <ListRow title="Categorias de receita" trailing={`${activeIncome} ativas`} chevron onClick={() => router.push('/config/categories')} />
      <ListRow title="Carteiras" trailing={`${activeWallets} ativas`} chevron onClick={() => router.push('/config/wallets')} />
      <FormRow label="Moeda padrão" htmlFor="currency">
        <select id="currency" value={profile?.currency ?? 'BRL'} onChange={e => save({ currency: e.target.value })}
          className="bg-transparent text-right text-body text-muted-foreground outline-none">
          {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </FormRow>
      <FormRow label="Saldo acumulado">
        <Switch checked={!!profile?.carryOverBalance} onCheckedChange={v => save({ carry_over_balance: v })} />
      </FormRow>
    </ListGroup>
  )
}
