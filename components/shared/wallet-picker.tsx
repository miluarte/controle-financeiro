'use client'

import { PickerRow } from './picker-row'
import { WALLET_TYPE_ICON } from '@/lib/constants'
import type { Wallet } from '@/lib/types'

export const walletOption = (w: Wallet) => ({
  value: w.id, label: w.ownerName ? `${w.name}, de ${w.ownerName}` : w.name, icon: WALLET_TYPE_ICON[w.type] ?? 'wallet',
})

// Escolha de carteira numa linha (seletor nativo), usada em pagamentos, importação e acertos.
export function WalletPicker({
  wallets, value, onChange, label = 'Carteira', id = 'wallet-picker',
}: { wallets: Wallet[]; value: string | null; onChange: (id: string) => void; label?: string; id?: string }) {
  return <PickerRow id={id} label={label} value={value} onChange={v => v && onChange(v)} options={wallets.map(walletOption)} />
}
