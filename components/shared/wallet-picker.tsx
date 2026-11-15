'use client'

import { ChoiceChip } from './choice-chip'
import { TokenIcon } from './token-icon'
import { WALLET_TYPE_ICON } from '@/lib/constants'
import type { Wallet } from '@/lib/types'

// Escolha de carteira em chips, usada em pagamentos (contas, fatura).
export function WalletPicker({
  wallets, value, onChange,
}: { wallets: Wallet[]; value: string | null; onChange: (id: string) => void }) {
  return (
    <li className="flex flex-wrap gap-2 p-3">
      {wallets.map(w => (
        <ChoiceChip key={w.id} selected={value === w.id} onClick={() => onChange(w.id)} className="pl-1">
          <TokenIcon icon={WALLET_TYPE_ICON[w.type] ?? 'wallet'} color="gray" size="sm" />
          {w.ownerName ? `${w.name}, de ${w.ownerName}` : w.name}
        </ChoiceChip>
      ))}
    </li>
  )
}
